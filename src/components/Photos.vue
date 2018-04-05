<template>
  <div class="photos">
    <photo v-for="(photo, index) in photos" :key="index" @click="clickPhoto(photo)"
           :icon="{ star: photo.starred, share: photo.public }"
           :source="`/photo?id=${photo.id}`" :title="photo.title" :date="photo.date">
      <md-menu-item v-if="$store.state.auth" @click="removePhoto(photo.id)">
        <md-icon>delete_forever</md-icon>
        Delete
      </md-menu-item>
    </photo>

    <md-speed-dial v-if="$store.state.auth" class="md-bottom-right" md-direction="top" md-event="click">
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
      </md-speed-dial-content>
    </md-speed-dial>
  </div>
</template>

<script>
  import { mapState } from 'vuex';
  import Photo from './module/Photo';

  export default {
    components: {
      Photo,
    },
    name: 'Photos',
    title() {
      return `${this.openAlbum.title || this.openAlbum} Album`;
    },
    data() {
      return {
        title: 'Album Title',
        photos: [],
        showMedia: {},
      };
    },
    computed: {
      ...mapState(['openAlbum']),
    },
    mounted() {
      this.loadPhotos();
    },
    methods: {
      loadPhotos() {
        let input = '';
        if (typeof this.openAlbum !== 'object') {
          input = `general:${this.openAlbum}`;
        } else {
          input = `albumId:${this.openAlbum.id}`;
        }
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `{photos(${this.$store.state.auth ? 'type:USER ' : ''}${input}){id title date mime public starred albumId}}`,
          },
        }).then((response) => {
          this.photos = response.data.data.photos;
        });
      },
      clickPhoto(photo) {
        this.$viewer.show(photo);
      },
      closeMedia() {
        this.$viewer.hide();
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
            this.loadPhotos();
          });
        };
        input.click();
      },
      removePhoto(id) {
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: `mutation RemovePhoto{removePhoto(photoId:${id}){success}}`,
          },
        }).then((response) => {
          if (response.data.data.removePhoto.success) {
            this.loadPhotos();
          }
        });
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import "../general";

  .photos {
    display: flex;
    flex-wrap: wrap;

    .photo {
      margin: 10px;
    }
  }
</style>
