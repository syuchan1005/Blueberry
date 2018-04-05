import fs from 'fs-extra';
import path from 'path';
import Sequelize from 'sequelize';
import { graphiqlKoa, graphqlKoa } from 'apollo-server-koa';
import { GraphQLScalarType } from 'graphql';
import { makeExecutableSchema } from 'graphql-tools';

class GraphQL {
  constructor(dbManager, schemaText, endpointURL, uploadFolder, logger) {
    this.db = dbManager;
    this.schemaText = schemaText;
    this.uploadFolder = uploadFolder;
    this.graphiQL = graphiqlKoa({ endpointURL });
    this.logger = logger;
  }

  middleware() {
    const db = this.db;
    const uploadFolder = this.uploadFolder;
    const photoModel2ql = (model) => {
      const data = model.dataValues;
      data.date = model.date.getTime();
      data.uploaded = model.createdAt.getTime();
      return data;
    };
    return async (context, next) => {
      await graphqlKoa({
        schema: makeExecutableSchema({
          typeDefs: this.schemaText,
          resolvers: {
            Milliseconds: new GraphQLScalarType({
              name: 'Milliseconds',
              description: 'Milliseconds of Unix time',
              serialize(value) {
                return parseInt(value, 10);
              },
              parseValue(value) {
                const d = new Date(value);
                return Number.isNaN(d.getTime()) ? null : d.getTime();
              },
              parseLiteral(ast) {
                return new Date(ast.value).getTime();
              },
            }),
            Query: {
              generalAlbum(obj, { limit }, ctx) {
                if (ctx.isUnauthenticated()) return Promise.reject('Unauthorized');
                const result = {
                  allCount: db.models.photo.count({ where: { userId: ctx.state.user.id } }),
                  publicCount: db.models.photo.count({
                    where: {
                      albumId: null,
                      public: true,
                      userId: ctx.state.user.id,
                    },
                  }),
                  starredCount: db.models.photo.count({
                    where: {
                      albumId: null,
                      starred: true,
                      userId: ctx.state.user.id,
                    },
                  }),
                  allSource: db.models.photo.findAll({
                    attributes: ['id'],
                    where: {
                      userId: ctx.state.user.id,
                    },
                    order: [['id', 'DESC']],
                    limit,
                  }).then(models => models.map(model => model.id)),
                  publicSource: db.models.photo.findAll({
                    attributes: ['id'],
                    where: {
                      albumId: null,
                      public: true,
                      userId: ctx.state.user.id,
                    },
                    order: [['id', 'DESC']],
                    limit,
                  }).then(models => models.map(model => model.id)),
                  starredSource: db.models.photo.findAll({
                    attributes: ['id'],
                    where: {
                      albumId: null,
                      starred: true,
                      userId: ctx.state.user.id,
                    },
                    order: [['id', 'DESC']],
                    limit,
                  }).then(models => models.map(model => model.id)),
                };
                return Promise.all(Object.values(result)).then(() => result);
              },
              albums(obj, { type }, ctx) {
                if (type === 'PUBLIC') {
                  return db.models.album.findAll({
                    where: { public: true },
                    attributes: {
                      include: [
                        [Sequelize.fn('COUNT', Sequelize.col('photos.id')), 'count'],
                        [Sequelize.fn('GROUP_CONCAT', Sequelize.col('photos.id')), 'sources'],
                      ],
                    },
                    include: [{ model: db.models.photo }],
                    group: ['albums.id'],
                  }).filter(model => model.id).then(models => models.map((model) => {
                    const data = model.dataValues;
                    data.source = data.sources.split(',').map(v => parseInt(v, 10))
                      .sort((a, b) => b - a).slice(0, 3)
                      .map(v => String(v));
                    return data;
                  }));
                } else if (ctx.isAuthenticated()) {
                  return db.models.album.findAll({
                    where: { userId: ctx.state.user.id },
                    attributes: {
                      include: [
                        [Sequelize.fn('COUNT', Sequelize.col('photos.id')), 'count'],
                        [Sequelize.fn('GROUP_CONCAT', Sequelize.col('photos.id')), 'sources'],
                      ],
                    },
                    include: [{ attributes: [], model: db.models.photo }],
                    group: ['albums.id'],
                  }).filter(model => model.id).then(models => models.map((model) => {
                    const data = model.dataValues;
                    if (data.sources) {
                      data.source = data.sources.split(',').map(v => parseInt(v, 10))
                        .sort((a, b) => b - a).slice(0, 3)
                        .map(v => String(v));
                    } else {
                      data.source = [];
                    }
                    return data;
                  }));
                }
                return [];
              },
              album(obj, { albumId }, ctx) {
                const or = [{ public: true }];
                if (ctx.isAuthenticated()) or.push({ userId: ctx.state.user.id });
                return db.models.album.findOne({
                  where: {
                    id: albumId,
                    [Sequelize.Op.or]: or,
                  },
                });
              },
              photos(obj, { type, limit, albumId, general }, ctx) {
                const find = {
                  order: [['id', 'DESC']],
                  limit,
                };
                if (type === 'PUBLIC') {
                  find.where = {
                    [Sequelize.Op.or]: [
                      { public: true },
                      { '$album.public$': true },
                    ],
                    albumId: albumId || null,
                  };
                  find.include = [
                    { model: db.models.album, attributes: [] },
                  ];
                } else if (ctx.isAuthenticated()) {
                  if (albumId) {
                    find.where = {
                      userId: ctx.state.user.id,
                      albumId,
                    };
                  } else if (general) {
                    switch (general) {
                      case 'Unsorted' :
                        find.where = {
                          userId: ctx.state.user.id,
                        };
                        break;
                      case 'Public' :
                        find.where = {
                          userId: ctx.state.user.id,
                          public: true,
                        };
                        break;
                      case 'Starred' :
                        find.where = {
                          userId: ctx.state.user.id,
                          starred: true,
                        };
                        break;
                      case 'Recent' :
                        find.where = {
                          userId: ctx.state.user.id,
                        };
                        find.order = [['updatedAt', 'DESC']];
                        break;
                      default:
                        return [];
                    }
                  }
                }
                if (find.where) {
                  return db.models.photo.findAll(find).then(models => models.map(photoModel2ql));
                }
                return [];
              },
              photo(obj, { photoId }, ctx) {
                const or = [{ public: true }, { '$album.public$': true }];
                if (ctx.isAuthenticated()) or.push({ userId: ctx.state.user.id });
                return db.models.photo.findOne({
                  where: {
                    id: photoId,
                    [Sequelize.Op.or]: or,
                  },
                  include: [{ model: db.models.album, attributes: [] }],
                }).then(model => (model ? photoModel2ql(model) : null));
              },
            },
            Mutation: {
              createAlbum(obj, args, ctx) {
                if (ctx.isUnauthenticated()) return Promise.reject('Unauthorized');
                return db.models.album.create({
                  title: args.title,
                  public: Boolean(args.public),
                  userId: ctx.state.user.id,
                }).then((album) => {
                  if (album) {
                    /* eslint-disable no-param-reassign */
                    album.count = 0;
                    album.source = [];
                  }
                  return album;
                });
              },
              changeAlbum(obj, args, ctx) {
                if (ctx.isUnauthenticated()) return Promise.reject('Unauthorized');
                const value = Object.keys(args).reduce((o, key) => {
                  // eslint-disable-next-line no-param-reassign
                  if (args[key] !== null) o[key] = args[key];
                  return o;
                }, {});
                return db.models.album.update(value, {
                  where: {
                    id: args.albumId,
                    userId: ctx.state.user.id,
                  },
                }).then(data => ({ success: data[0] === 1 }));
              },
              removeAlbum(obj, { albumId }, ctx) {
                if (ctx.isUnauthenticated()) return Promise.reject('Unauthorized');
                return db.models.photo.update({ albumId: null }, {
                  where: {
                    albumId,
                    userId: ctx.state.user.id,
                  },
                }).then(db.models.album.destroy({
                  where: {
                    id: albumId,
                    userId: ctx.state.user.id,
                  },
                })).then(rmRow => ({ success: rmRow === 1 }));
              },
              changePhoto(obj, args, ctx) {
                if (ctx.isUnauthenticated()) return Promise.reject('Unauthorized');
                const value = Object.keys(args).reduce((o, key) => {
                  // eslint-disable-next-line no-param-reassign
                  if (args[key] !== null) o[key] = args[key];
                  return o;
                }, {});
                if (value.albumId && value.albumId === -1) value.albumId = null;
                return db.models.photo.update(value, {
                  where: {
                    id: args.photoId,
                    userId: ctx.state.user.id,
                  },
                }).then(data => ({ success: data[0] === 1 }));
              },
              removePhoto(obj, { photoId }, ctx) {
                if (ctx.isUnauthenticated()) return Promise.reject('Unauthorized');
                return db.models.photo.findOne({
                  where: {
                    id: photoId,
                    userId: ctx.state.user.id,
                  },
                }).then((photo) => {
                  fs.unlinkSync(`${uploadFolder}/original/${photo.uuid}${path.extname(photo.originalName)}`);
                  fs.unlinkSync(`${uploadFolder}/thumbnail/${photo.uuid}.png`);
                }).then(() => db.models.photo.destroy({
                  where: {
                    id: photoId,
                    userId: ctx.state.user.id,
                  },
                })).then(rmRow => ({ success: rmRow === 1 }));
              },
            },
          },
        }),
        context,
      })(context, next);
    };
  }
}

export default GraphQL;
