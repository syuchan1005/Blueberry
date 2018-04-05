<template>
  <div class="media-viewer" v-show="showApp">
    <md-app md-waterfall md-mode="fixed">
      <md-app-toolbar>
        <div class="md-toolbar-row">
          <div class="md-toolbar-section-start">
            <md-button class="md-icon-button" @click="hide">
              <md-icon>arrow_back</md-icon>
            </md-button>
            <span class="md-title">{{ title }}</span>
            <md-button class="md-icon-button" @click="renameDialog.value = title;renameDialog.show = true;" v-if="allowChange">
              <md-icon>create</md-icon>
            </md-button>
          </div>

          <div class="md-toolbar-section-end">
            <md-field v-if="loadInfoActive">
              <label>Album</label>
              <md-select v-model="computedAlbumId" :disabled="!allowChange">
                <md-option class="md-accent" :value="0">No Album</md-option>
                <md-option v-for="album in albums" :key="album.id" :value="album.id">
                  {{ album.title }}
                </md-option>
              </md-select>
            </md-field>

            <div class="changes" v-if="allowChange">
              <md-button class="md-icon-button" @click="$emit('clickStarred', $event)">
                <md-icon :class="{ starred }">star</md-icon>
              </md-button>
              <md-button class="md-icon-button" @click="$emit('clickPublic', $event)">
                <md-icon :class="{ public }">share</md-icon>
              </md-button>
            </div>
            <md-menu md-direction="bottom-end" :md-close-on-select="false">
              <md-button class="md-icon-button" @click="loadInfo" md-menu-trigger>
                <md-icon>info_outline</md-icon>
              </md-button>

              <md-menu-content>
                <md-table>
                  <md-table-row>
                    <md-table-cell>LastModified</md-table-cell>
                    <md-table-cell>{{ formatTime(date) }}</md-table-cell>
                  </md-table-row>
                  <md-table-row>
                    <md-table-cell>Uploaded</md-table-cell>
                    <md-table-cell>{{ formatTime(info.uploaded) }}</md-table-cell>
                  </md-table-row>
                  <md-table-row>
                    <md-table-cell>Size</md-table-cell>
                    <md-table-cell>{{ formatSize(info.size) }}</md-table-cell>
                  </md-table-row>
                  <md-table-row>
                    <md-table-cell>Format</md-table-cell>
                    <md-table-cell>{{ mime }}</md-table-cell>
                  </md-table-row>
                  <md-table-row>
                    <md-table-cell>Resolution</md-table-cell>
                    <md-table-cell>{{ info.resolution }}</md-table-cell>
                  </md-table-row>
                </md-table>
              </md-menu-content>
            </md-menu>
          </div>
        </div>
      </md-app-toolbar>

      <md-app-content class="content" v-if="id !== -1">
        <img v-if="mime.startsWith('image/')" style="opacity: 0" ref="imageView"
             :src="`/photo?id=${id}&type=original`" @load="viewerInit"/>
        <plyr-video v-else ref="videoView"
                    :videos="[{ src: `/photo?id=${id}&type=original`, format: mime.substr(6) }]"
                    :poster="`/photo?id=${id}`"/>
      </md-app-content>
    </md-app>

    <md-dialog :md-active.sync="renameDialog.show">
      <md-dialog-title>Rename Album</md-dialog-title>

      <md-dialog-content>
        <md-field>
          <label>Album name</label>
          <md-input v-model="renameDialog.value"/>
        </md-field>
      </md-dialog-content>

      <md-dialog-actions>
        <md-button class="md-primary" @click="renameDialog.show = false">{{ $t('cancel') }}</md-button>
        <md-button class="md-primary" @click="$emit('clickRename', renameDialog.value);renameDialog.show = false;">Create</md-button>
      </md-dialog-actions>
    </md-dialog>
  </div>
</template>

<script>
  import filesize from 'filesize';
  import format from 'date-fns/format';
  import Viewer from 'viewerjs';
  import { PlyrVideo } from 'vue-plyr';
  import 'viewerjs/dist/viewer.min.css';
  import 'vue-plyr/dist/vue-plyr.css';

  export default {
    components: {
      Viewer,
      PlyrVideo,
    },
    name: 'MediaViewer',
    /*
    events: {
      clickPublic,
      clickStarred,
      clickRename,
      changeAlbumId,
    }
     */
    props: {
      id: {
        type: Number,
        default: -1,
      },
      title: {
        type: String,
        default: '',
      },
      starred: {
        type: Boolean,
        default: false,
      },
      public: {
        type: Boolean,
        default: false,
      },
      mime: {
        type: String,
        default: '',
      },
      date: {
        type: Number,
        default: 0,
      },
      albumId: {
        type: Number,
      },
    },
    data() {
      return {
        showApp: false,
        viewer: undefined,
        renameDialog: {
          show: false,
          value: '',
        },
        info: {},
        albums: [],
        loadInfoActive: false,
      };
    },
    computed: {
      allowChange() {
        return this.$store.state.auth;
      },
      computedAlbumId: {
        get() {
          return this.albumId || 0;
        },
        set(value) {
          this.loadInfoActive = false;
          this.$emit('changeAlbumId', value || null);
          this.$nextTick(() => {
            this.loadInfoActive = true;
          });
        },
      },
    },
    watch: {
      computedAlbumId(id) {
        if (id === 0) return;
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `{album(albumId:${id}){id title}}`,
          },
        }).then((response) => {
          this.loadInfoActive = false;
          this.albums = [response.data.data.album];
        }).then(() => { this.loadInfoActive = true; });
      },
    },
    mounted() {
      document.cancelFullScreen =
        (document.cancelFullScreen || document.webkitCancelFullScreen || document.exitFullscreen);
    },
    methods: {
      formatSize(size) {
        if (!size) return undefined;
        return filesize(size, { standard: 'iec' });
      },
      formatTime(mills) {
        if (!mills) return undefined;
        return format(new Date(mills), 'YYYY/MM/DD HH:mm');
      },
      viewerInit() {
        if (this.viewer) {
          this.viewer.destroy();
          this.viewer = undefined;
        }
        const showOption = {
          show: true,
          size: 'large',
        };
        this.viewer = new Viewer(this.$refs.imageView, {
          inline: true,
          button: false,
          navbar: false,
          title: false,
          toolbar: {
            zoomIn: showOption,
            zoomOut: showOption,
            oneToOne: showOption,
            reset: showOption,
            prev: false,
            play: false,
            next: false,
            rotateLeft: showOption,
            rotateRight: showOption,
            flipHorizontal: showOption,
            flipVertical: showOption,
          },
          tooltip: false,
          backdrop: false,
        });
      },
      loadInfo() {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `{photo(photoId:${this.id}){uploaded size resolution}}`,
          },
        }).then((response) => {
          this.info = response.data.data.photo;
        });
      },
      show() {
        this.loadInfoActive = false;
        if (this.$store.state.auth) {
          this.$http({
            method: 'POST',
            url: '/api',
            data: {
              query: '{albums(type:USER){id title}}',
            },
          }).then((response) => {
            this.albums = response.data.data.albums;
            return this.$nextTick();
          }).then(() => { this.loadInfoActive = true; });
        }
        this.showApp = true;
      },
      hide() {
        this.showApp = false;
        if (this.mime.startsWith('image/') && this.viewer) {
          this.viewer.destroy();
          this.viewer = undefined;
        } else if (this.mime.startsWith('video/')) {
          this.$refs.videoView.$refs.video.pause();
        }
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import "../../general";

  .media-viewer {
    z-index: 5;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .content {
    overflow: hidden;
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    justify-content: center;
  }

  .md-icon-button {
    .info {
      color: $dark-primary-color;
    }

    .public {
      color: $warning-color;
    }

    .starred {
      color: $star-color;
    }
  }

  .changes {
    display: flex;
    align-items: center;

    .md-icon-button {
      margin: 0;
    }
  }

  .md-menu-content[x-placement] {
    max-width: none;
    max-height: none;
  }
</style>
