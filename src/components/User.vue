<template>
  <div class="user">
    <div class="title">{{ $t('general_album.name') }}</div>
    <div class="albums">
      <album :title="$t('unsorted')" :sources="fetchURL(generalAlbum.allSource)"
             :count="generalAlbum.allCount" icon="list" @click="openAlbum('Unsorted')"/>
      <album :title="$t('public')" :sources="fetchURL(generalAlbum.publicSource)" :count="generalAlbum.publicCount"
             icon="share" @click="openAlbum('Public')"/>
      <album :title="$t('starred')" :sources="fetchURL(generalAlbum.starredSource)" :count="generalAlbum.starredCount"
             icon="star" @click="openAlbum('Starred')"/>
      <album :title="$t('recent')" icon="schedule" @click="openAlbum('Recent')"/>
    </div>
    <div class="title">{{ $tc('album', 2)}}</div>

    <div class="albums">
      <album v-for="album in albums" :key="album.id"
             :title="album.title" :count="album.count" :icon="album.public ? 'share' : undefined"
             :sources="fetchURL(album.source)" @click="openAlbum(album)">
        <md-menu-item @click="renameDialog.value = album.title;renameDialog.albumId = album.id;renameDialog.show = true;">
          <md-icon>create</md-icon>
          <span>Rename</span>
        </md-menu-item>
        <md-menu-item v-if="!album.public" @click="setPublic(album.id, true)">
          <md-icon>share</md-icon>
          <span>Public</span>
        </md-menu-item>
        <md-menu-item v-else @click="setPublic(album.id, false)">
          <div class="stack-icon">
            <md-icon>share</md-icon>
            <md-icon>close</md-icon>
          </div>
          <span>NonPublic</span>
        </md-menu-item>
        <md-menu-item @click="removeAlbum(album.id)">
          <md-icon>delete_forever</md-icon>
          <span>Delete</span>
        </md-menu-item>
      </album>
    </div>

    <md-speed-dial class="md-bottom-right" md-direction="top" md-event="click">
      <md-speed-dial-target class="md-primary">
        <md-icon class="md-morph-initial">add</md-icon>
        <md-icon class="md-morph-final">close</md-icon>
      </md-speed-dial-target>

      <md-speed-dial-content>
        <div class="button">
          <label>Upload Photo</label>
          <md-button class="md-icon-button" @click="uploadPhoto">
            <md-icon>photo</md-icon>
          </md-button>
        </div>

        <div class="button" v-if="$route.path === '/user'">
          <label>New Album</label>
          <md-button class="md-icon-button" @click="createDialog.show = true">
            <md-icon>folder</md-icon>
          </md-button>
        </div>
      </md-speed-dial-content>
    </md-speed-dial>

    <md-dialog :md-active="createDialog.show">
      <md-dialog-title>New Album</md-dialog-title>

      <md-dialog-content>
        <md-field>
          <label>Album name</label>
          <md-input v-model="createDialog.value"/>
        </md-field>

        <md-checkbox v-model="createDialog.public">public</md-checkbox>
      </md-dialog-content>

      <md-dialog-actions>
        <md-button class="md-primary" @click="createDialog.show = false">{{ $t('cancel') }}</md-button>
        <md-button class="md-primary" @click="createAlbum">Create</md-button>
      </md-dialog-actions>
    </md-dialog>

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
        <md-button class="md-primary" @click="renameAlbum">Create</md-button>
      </md-dialog-actions>
    </md-dialog>
  </div>
</template>

<script>
  import Album from './module/Album';

  export default {
    components: {
      Album,
    },
    name: 'User',
    title: 'User',
    data() {
      return {
        albums: [],
        generalAlbum: {},
        createDialog: {
          show: false,
          value: '',
          public: false,
        },
        renameDialog: {
          show: false,
          value: '',
          albumId: undefined,
        },
      };
    },
    watch: {
      'createDialog.show'(newValue) { // eslint-disable-line object-shorthand
        if (!newValue) {
          this.createDialog.value = '';
          this.createDialog.public = false;
        }
      },
    },
    mounted() {
      this.loadAlbums();
      this.loadGeneralAlbum();
    },
    methods: {
      loadAlbums() {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: '{albums(type:USER){id title count source public}}',
          },
        }).then((response) => {
          this.albums = response.data.data.albums;
        });
      },
      loadGeneralAlbum() {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: '{generalAlbum{allCount publicCount starredCount allSource publicSource starredSource}}',
          },
        }).then((response) => {
          this.generalAlbum = response.data.data.generalAlbum;
        });
      },
      openAlbum(album) {
        this.$store.commit('setOpenAlbum', album);
        this.$router.push('/photos');
      },
      createAlbum() {
        this.createDialog.show = false;
        if (!this.createDialog.value) return;
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation CreateAlbum{createAlbum(title:"${this.createDialog.value}"public:${this.createDialog.public}){id title count source public}}`,
          },
        }).then((response) => {
          this.albums.push(response.data.data.createAlbum);
        });
      },
      renameAlbum() {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation RenameAlbum{changeAlbum(albumId:${this.renameDialog.albumId}title:"${this.renameDialog.value}"){success}}`,
          },
        }).then((response) => {
          this.renameDialog.show = false;
          if (response.data.data.changeAlbum.success) {
            this.loadAlbums();
          }
        });
      },
      setPublic(id, pub) {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation PublicAlbum{changeAlbum(albumId:${id} public:${pub}){success}}`,
          },
        }).then((response) => {
          if (response.data.data.changeAlbum.success) {
            this.loadAlbums();
          }
        });
      },
      removeAlbum(id) {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation RemoveAlbum{removeAlbum(albumId:${id}){success}}`,
          },
        }).then((response) => {
          if (response.data.data.removeAlbum.success) {
            this.loadAlbums();
          }
        });
      },
      fetchURL(source) {
        if (!source) return [];
        return source.map(v => `/photo?id=${v}`);
      },
      uploadPhoto() {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = 'video/*,image/*';
        input.onchange = (event) => {
          event.preventDefault();
          const formData = new FormData();
          const files = input.files;
          let date = '';
          for (let i = 0; i < files.length; i += 1) {
            date += `${files[i].lastModified},`;
            formData.append('photos', files[i]);
          }
          formData.append('date', date.substring(0, date.length - 1));
          this.$http({
            method: 'post',
            url: '/upload',
            data: formData,
          }).then(() => {
            this.loadGeneralAlbum();
          });
        };
        input.click();
      },
    },
  };
</script>

<style lang="scss" scoped>
  .user {
    .albums {
      display: flex;
      flex-wrap: wrap;
    }

    .title {
      font-size: 1.2em;
    }
  }

  .stack-icon {
    .md-icon {
      position: absolute;
      color: lightgray;
    }

    .md-icon:nth-last-child(1) {
      position: relative;
      color: black;
    }
  }
</style>
