<template>
  <div id="app">
    <md-app md-waterfall md-mode="fixed">
      <md-app-toolbar class="md-primary">
        <div class="md-toolbar-row">
          <div class="md-toolbar-section-start">
            <md-button class="md-icon-button" @click="$router.push($store.state.auth ? '/user' : '/')" v-if="$route.path === '/photos'">
              <md-icon>arrow_back</md-icon>
            </md-button>
            <span class="md-title">Blueberry</span>
          </div>

          <div class="md-toolbar-section-end" v-if="$route.path === '/'">
            <md-button class="md-raised" @click="dialog.type = 'signUp';dialog.show = true;">
              {{ $t('signUp') }}
            </md-button>

            <md-button class="md-raised" @click="dialog.type = 'signIn';dialog.show = true;">
              {{ $t('signIn') }}
            </md-button>
          </div>

          <div class="md-toolbar-section-end" v-else>
            <md-button class="md-raised" @click="$router.push('/')">
              {{ $t('signOut') }}
            </md-button>
          </div>
        </div>
      </md-app-toolbar>

      <md-app-content>
        <router-view></router-view>
      </md-app-content>
    </md-app>

    <notifications position="bottom right" animation-type="velocity" classes="vue-notification notification-style"/>

    <md-dialog :md-active.sync="dialog.show">
      <md-dialog-title>{{ $t(dialog.type) }}</md-dialog-title>

      <md-dialog-content>
        <md-field>
          <label>{{ $t('username') }}</label>
          <md-input v-model="dialog.username"></md-input>
        </md-field>

        <md-field>
          <label>{{ $t('password') }}</label>
          <md-input type="password" v-model="dialog.password"></md-input>
        </md-field>
      </md-dialog-content>

      <md-dialog-actions>
        <md-button class="md-primary" @click="dialog.show = false">{{ $t('cancel') }}</md-button>
        <md-button class="md-primary" @click="clickDialog">{{ $t(dialog.type) }}</md-button>
      </md-dialog-actions>
    </md-dialog>

    <media-viewer :id="showMedia.id" :title="showMedia.title" :starred="showMedia.starred" :album-id="showMedia.albumId"
                  :public="showMedia.public" :mime="showMedia.mime" :date="showMedia.date" ref="viewer"
                  @clickPublic="setPublic(showMedia.id, !showMedia.public)"
                  @clickStarred="setStarred(showMedia.id, !showMedia.starred)"
                  @clickRename="renamePhoto(showMedia.id, $event)"
                  @changeAlbumId="setAlbum(showMedia.id, $event)"/>
  </div>
</template>

<script>
  import Vue from 'vue';
  import MediaViewer from '@/components/module/MediaViewer';

  export default {
    components: {
      MediaViewer,
    },
    name: 'app',
    data() {
      return {
        dialog: {
          show: false,
          type: '',
          username: '',
          password: '',
        },
        showMedia: {},
      };
    },
    watch: {
      'dialog.show'(newValue) { // eslint-disable-line object-shorthand
        if (!newValue) {
          this.dialog.username = '';
          this.dialog.password = '';
        }
      },
    },
    mounted() {
      Vue.prototype.$viewer = {
        show: (photo) => {
          this.showMedia = photo;
          this.$refs.viewer.show();
        },
        hide: () => {
          this.$refs.viewer.hide();
          this.showMedia = undefined;
        },
      };
    },
    methods: {
      clickDialog() {
        if (!this.dialog.username) {
          this.$notify({
            type: 'error',
            title: 'Login failed',
            text: 'Username not found',
          });
        } else if (!this.dialog.password || this.dialog.password.length < 8) {
          this.$notify({
            type: 'error',
            title: 'Login failed',
            text: 'Password too short (minimum 7 chars)',
          });
        } else {
          this.$http({
            method: 'POST',
            url: '/auth/local',
            data: {
              username: this.dialog.username,
              password: this.dialog.password,
              create: (this.dialog.type === 'signUp'),
            },
          }).then(() => {
            this.$store.commit('setAuth', true);
            this.$router.push('/user');
            this.dialog.show = false;
          }).catch((err) => {
            this.$notify({
              type: 'error',
              title: 'Login failed',
              text: err.response.data,
            });
          });
        }
      },
      setPublic(id, pub) {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation publicPhoto{changePhoto(photoId:${id} public:${pub}){success}}`,
          },
        }).then((response) => {
          if (response.data.data.changePhoto) {
            this.showMedia.public = pub;
          }
        });
      },
      setStarred(id, starred) {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation starredPhoto{changePhoto(photoId:${id} starred:${starred}){success}}`,
          },
        }).then((response) => {
          if (response.data.data.changePhoto) {
            this.showMedia.starred = starred;
          }
        });
      },
      renamePhoto(id, title) {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation renamePhoto{changePhoto(photoId:${id} title:"${title}"){success}}`,
          },
        }).then((response) => {
          if (response.data.data.changePhoto) {
            this.showMedia.title = title;
          }
        });
      },
      setAlbum(photoId, albumId) {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation ChangePhoto{changePhoto(photoId:${photoId} albumId:${albumId || -1}){success}}`,
          },
        }).then((response) => {
          if (response.data.data.changePhoto.success) {
            this.showMedia.albumId = albumId;
          }
        });
      },
    },
  };
</script>

<style lang="scss">
  html, body, #app, .md-app {
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;

    overflow: hidden;
  }

  .notification-style {
    font-size: 15px;
  }

  .md-speed-dial {
    .button {
      display: flex;
      align-items: center;

      label {
        width: 100%;
        opacity: 0;
        position: absolute;
        right: 55px;

        transition-delay: 1s;
        transition: ease 0.2s;
      }
    }

    &.md-active .button {
      label {
        opacity: 1;
      }
    }
  }
</style>
