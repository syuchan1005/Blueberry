<template>
  <div class="hello" :class="{ empty: isEmpty }">
    <md-empty-state v-if="isEmpty"
                    md-icon="photo_library"
                    :md-label="$t('empty_photos')"
    />
    <div v-if="albums.length > 0">
      <div class="title">{{ $tc('album', 2)}}</div>
      <div class="albums">
        <album v-for="(album, index) in albums" :key="index"
               :title="album.title" :count="album.count" :icon="album.public ? 'share' : undefined"
               :sources="fetchURL(album.source)" @click="openAlbum(album)"/>
      </div>
    </div>
    <div v-if="photos.length > 0">
      <div class="title">{{ $tc('photos') }}</div>
      <div class="photos">
        <photo v-for="(photo, index) in photos" :key="index"
               :title="photo.title" :icon="photo.public ? 'share' : undefined" :source="`/photo?id=${photo.id}`"
               :date="photo.date" @click="openPhoto(photo)"/>
      </div>
    </div>
  </div>
</template>

<script>
  import Album from './module/Album';
  import Photo from './module/Photo';

  export default {
    components: {
      Photo,
      Album,
    },
    name: 'hello',
    title: 'Hello',
    data() {
      return {
        photos: [],
        albums: [],
        loaded: {
          photo: false,
          albums: false,
        },
      };
    },
    computed: {
      isEmpty() {
        return this.loaded.photo && this.loaded.albums &&
          this.photos.length === 0 && this.albums.length === 0;
      },
    },
    mounted() {
      this.$http({ url: '/auth/logout' });
      this.$store.commit('setAuth', false);
      this.loadAlbums();
      this.loadPhotos();
    },
    methods: {
      loadAlbums() {
        this.loaded.albums = false;
        this.$http({
          method: 'POST',
          url: '/api',
          data: {
            query: '{albums{id title count source public}}',
          },
        }).then((response) => {
          this.albums = response.data.data.albums;
          this.loaded.albums = true;
        });
      },
      loadPhotos() {
        this.loaded.photo = false;
        this.$http({
          method: 'post',
          url: '/api',
          data: {
            query: '{photos{id title date mime albumId}}',
          },
        }).then((response) => {
          this.photos = response.data.data.photos;
          this.loaded.photo = true;
        });
      },
      fetchURL(source) {
        if (!source) return [];
        return source.map(v => `/photo?id=${v}`);
      },
      openAlbum(album) {
        this.$store.commit('setOpenAlbum', album);
        this.$router.push('/photos');
      },
      openPhoto(photo) {
        this.$viewer.show(photo);
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import "../general";

  .hello {
    display: flex;
    flex-wrap: wrap;
    flex-direction: column;
    justify-content: center;

    & > div {
      margin: 5px;
    }

    .albums {
      display: flex;
      flex-wrap: wrap;
    }

    .photos {
      display: flex;
      flex-wrap: wrap;

      .photo {
        margin: 20px;
      }
    }

    .title {
      font-size: 1.2em;
    }
  }

  .hello.empty {
    height: 100%;
    justify-content: center;
  }
</style>
