import fs from 'fs-extra';
import path from 'path';
import debug from 'debug';
import Sequelize from 'sequelize';
import ffmpeg from 'fluent-ffmpeg';

import Koa from 'koa';
import Range from 'koa-range';
import BodyParser from 'koa-bodyparser';
import Session from 'koa-session';
import passport from 'koa-passport';
import { Strategy as LocalStrategy } from 'passport-local';
import Router from 'koa-router';
import Serve from 'koa-static';
import multer from 'koa-multer';
import historyFallback from 'koa2-connect-history-api-fallback';
import send from 'koa-send';

import DBManager from './DBManager';
import config from '../../config';
import GraphQL from './GraphQL';

const serverLog = debug('server');
const db = new DBManager(process.env.NODE_ENV === 'develop' ? config.dev.connectionURI : config.build.connectionURI);
const uploadFolder = `${process.env.NODE_ENV === 'develop' ? config.dev.uploadFolder : config.build.uploadFolder}/`;
const graphQL = new GraphQL(db, fs.readFileSync('schema.graphql', 'utf-8'), '/api', uploadFolder, debug('server:graphql'));

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser((id, done) => {
  db.models.user.findById(id).then(() => {
    done(null, { id });
  }).catch((err) => {
    done(err);
  });
});

passport.use(new LocalStrategy({
  passReqToCallback: true,
}, (request, username, password, done) => {
  db.findUser(username, password, request.body.create)
    .then(({ id }) => {
      done(null, { id });
    })
    .catch(err => done(err));
}));

const app = new Koa();
app.keys = ['secret'];
const router = Router();

const port = process.env.PORT || 3000;
let listenLog = () => {
  serverLog(`> Listening at http://localhost:${port}\n`);
};

if (process.env.NODE_ENV === 'develop') {
  /* eslint-disable global-require */

  console.log('> Starting dev server...');
  const log = listenLog;
  listenLog = undefined;

  const { devMiddleware, hotMiddleware } = require('koa-webpack-middleware');
  const webpackConfig = require('../../build/webpack.dev.conf');

  const compiler = require('webpack')(webpackConfig);

  compiler.plugin('compilation', (compilation) => {
    compilation.plugin('html-webpack-plugin-after-emit', (data, callback) => {
      callback();
    });
  });

  const dev = devMiddleware(compiler, {
    publicPath: webpackConfig.output.publicPath,
    quiet: true,
  });
  dev.waitUntilValid(log);
  app.use(async (ctx, next) => {
    if (['/user', '/photos'].includes(ctx.path)) ctx.path = '/';
    await next();
  });
  app.use(dev);
  app.use(hotMiddleware(compiler, {
    log: false,
  }));

  const staticPath = path.posix.join(config.dev.assetsPublicPath, config.dev.assetsSubDirectory);
  router.get(`${staticPath}/*`, async (ctx, next) => {
    ctx.path = ctx.path.substring(staticPath.length);
    await next();
  }, Serve('static/'), async (ctx) => {
    ctx.throw(404);
  });
}

fs.ensureDirSync(`${uploadFolder}/original/`);
fs.ensureDirSync(`${uploadFolder}/thumbnail/`);
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      callback(null, `${uploadFolder}/original`);
    },
    filename(req, file, callback) {
      db.models.photo.create({
        date: Date.now(),
        originalName: file.originalname,
        mime: file.mimetype,
        userId: req.user.id,
      }).then((photo) => {
        callback(null, `${photo.uuid}${path.extname(file.originalname)}`);
      });
    },
  }),
});

app.use(Range);
app.use(BodyParser());
app.use(Session({}, app));
app.use(passport.initialize());
app.use(passport.session());

const authRouter = Router();

authRouter.post('/local', async (ctx, next) => {
  await passport.authenticate('local', async (err, user) => {
    if (err || !user) {
      ctx.throw(401, err);
    } else {
      await ctx.login(user);
      ctx.status = 200;
      ctx.body = 'OK';
    }
  })(ctx, next);
});

authRouter.get('/logout', (ctx) => {
  ctx.logout();
  ctx.status = 200;
  ctx.body = 'OK';
});

router.use('/auth', authRouter.routes(), authRouter.allowedMethods());

router.all('/api', graphQL.middleware());
router.get('/graphiql', graphQL.graphiQL);

router.post('/upload', async (ctx, next) => {
  if (ctx.isAuthenticated()) {
    await next();
  } else {
    ctx.throw(401);
  }
}, upload.array('photos'), async (ctx) => {
  const dates = ctx.req.body.date.split(',').map(v => parseInt(v, 10));
  const names = ctx.req.files.map(file => file.filename);
  await Promise.all(names.map((file, i) => {
    if (!dates[i] || dates[i] < 0) return Promise.resolve();
    const uuid = path.basename(file, path.extname(file));
    const originalPath = `${uploadFolder}/original/${file}`;
    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(originalPath)
        .ffprobe((err, meta) => {
          if (err) reject(err);
          else {
            const data = meta.streams[0];
            resolve({
              resolution: `${data.width} x ${data.height}`,
              size: meta.format.size,
            });
          }
        });
    }).then(({ resolution, size }) => db.models.photo.update({
      date: dates[i],
      resolution,
      size,
    }, {
      where: {
        uuid,
      },
    })).then(() => new Promise((resolve, reject) => {
      ffmpeg()
        .input(originalPath)
        .outputOption('-vframes 1')
        .videoFilter('scale=200:200:force_original_aspect_ratio=decrease,pad=200:200:(ow-iw)/2:(oh-ih)/2:white')
        .format('image2pipe')
        .outputOption('-vcodec png')
        .output(`${uploadFolder}/thumbnail/${uuid}.png`)
        .on('error', reject)
        .on('end', resolve)
        .run();
    }));
  }));
  ctx.status = 200;
  ctx.body = 'OK';
});

router.get('/photo', async (ctx) => {
  if (!ctx.query.id) {
    ctx.throw(400);
    return;
  }
  const or = [{ public: true }, { '$album.public$': true }];
  if (ctx.isAuthenticated()) or.push({ userId: ctx.state.user.id });
  const photo = await db.models.photo.findOne({
    where: { id: ctx.query.id, [Sequelize.Op.or]: or },
    include: [{ model: db.models.album }],
  });
  if (!photo) {
    ctx.throw(404);
    return;
  }
  let filePath;
  if (ctx.query.type === 'original') {
    filePath = `${uploadFolder}/original/${photo.uuid}${path.extname(photo.originalName)}`;
  } else {
    filePath = `${uploadFolder}/thumbnail/${photo.uuid}.png`;
  }
  await send(ctx, filePath);
});

app.use(router.routes());
app.use(router.allowedMethods());

app.use(historyFallback());
app.use(Serve('dist'));

app.listen(port, db.authenticate().then(listenLog));

