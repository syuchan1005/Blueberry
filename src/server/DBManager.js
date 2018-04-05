import Sequelize from 'sequelize';
import debug from 'debug';

class DBManager {
  constructor(connectionURI) {
    this.logging = debug('server:database');
    this.db = new Sequelize(connectionURI, {
      logging: this.logging,
      operatorsAliases: Sequelize.Op,
    });
  }

  async authenticate() {
    await this.db.authenticate();
    this.createModels();
    await Promise.all(Object.values(this.models).map(v => v.sync()));
  }

  createModels() {
    this.models = {
      user: this.db.define('Users', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        username: {
          type: Sequelize.TEXT,
          allowNull: false,
          unique: true,
        },
        password: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
      }),
      album: this.db.define('Albums', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        title: {
          type: Sequelize.TEXT,
          allowNull: false,
          default: 'Untitled',
        },
        public: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
      }),
      photo: this.db.define('Photos', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        uuid: {
          type: Sequelize.UUID,
          allowNull: false,
          defaultValue: Sequelize.UUIDV4,
        },
        title: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: 'Untitled',
        },
        date: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        originalName: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        mime: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        public: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        starred: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        size: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        resolution: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: '0 x 0',
        },
      }),
    };
    this.models.user.hasMany(this.models.album, { foreignKey: 'userId' });
    this.models.user.hasMany(this.models.photo, { foreignKey: 'userId' });
    this.models.album.hasMany(this.models.photo, { foreignKey: 'albumId' });
    this.models.photo.belongsTo(this.models.album, { foreignKey: 'albumId' });
  }

  async findUser(username, password, create) {
    if (create) {
      const user = await this.models.user.findOne({
        where: { username },
      });
      if (user !== null) return Promise.reject('Username is already taken');
    }
    return (create ? this.models.user.findOrCreate({
      where: { username, password },
      defaults: { username, password },
    }).then(value => value[0]) : this.models.user.findOne({
      where: { username, password },
    })).then((user) => {
      if (user === null) return Promise.reject('User not found');
      return Promise.resolve(user);
    });
  }
}

export default DBManager;
