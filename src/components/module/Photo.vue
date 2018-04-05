<template>
  <div class="photo">
    <md-card :class="{ error }" @click.native="$emit('click', $event)">
      <div class="icons" v-if="icon">
        <div class="icon" v-for="(ic, i) in icons" :key="i">
          <md-icon>{{ ic }}</md-icon>
        </div>
      </div>

      <md-card-media-cover>
        <md-card-media md-ratio="1:1">
          <img :draggable="false" :src="source" v-if="!error" @error="error = true"/>
        </md-card-media>

        <md-card-area>
          <md-card-header>
            <span class="md-title">{{ title }}</span>
            <span class="md-subhead">{{ dateString }}</span>
          </md-card-header>
        </md-card-area>
      </md-card-media-cover>

      <md-menu md-size="auto" md-direction="bottom-start" class="menu-button" v-if="$slots.default">
        <md-button class="md-icon-button" @click.stop md-menu-trigger>
          <md-icon>more_vert</md-icon>
        </md-button>

        <md-menu-content>
          <slot />
        </md-menu-content>
      </md-menu>
    </md-card>
  </div>
</template>

<script>
  import format from 'date-fns/format';

  export default {
    name: 'Photo',
    /*
    events: [
      click
    ]
    */
    props: {
      source: {
        require: true,
        type: String,
      },
      title: {
        type: String,
        default: '',
      },
      date: {
        type: Number,
      },
      icon: {
        type: [String, Array, Object],
        default: undefined,
      },
    },
    computed: {
      icons() {
        if (this.icon) {
          if (Array.isArray(this.icon)) {
            return this.icon;
          } else if (typeof this.icon === 'object') {
            const icons = [];
            Object.keys(this.icon).forEach((key) => {
              if (this.icon[key]) icons.push(key);
            });
            return icons;
          }
          return [this.icon];
        }
        return [];
      },
      dateString() {
        if (!this.date) return undefined;
        return format(new Date(this.date), 'YYYY/MM/DD');
      },
    },
    data() {
      return {
        error: false,
      };
    },
  };
</script>

<style lang="scss" scoped>
  @import "../../general";

  $size: 200px;

  .photo {
    width: $size;
    height: $size;

    .md-card {
      width: $size;
      height: $size;
      background-color: $background-color;
      border: solid 1px $border-color;
      box-shadow: none;
      margin: 0;

      .md-card-area {
        color: $background-color;
      }

      .menu-button {
        position: absolute;
        right: 0;
        bottom: 6px;
      }

      &.error {
        background-color: lighten($error-color, 5);

        .md-card-header {
          opacity: 1;
        }
      }

      &:hover {
        border: solid 1px $dark-primary-color;

        .md-card-header {
          padding: 0 0 8px 16px;
          margin: 16px 0 8px;
          background-color: rgba(darken($sub-color, 10), 0.7);
          opacity: 1;
        }
      }

      .icons {
        z-index: 1;
        position: absolute;
        display: flex;
      }

      .icon {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-left: 5px;

        width: 35px;
        height: 45px;
        background-color: darken(red, 6);
        border: solid 2px white;
        border-top: none;
        border-radius: 0 0 15% 15%;

        .md-icon {
          color: white;
        }
      }

      .md-card-header {
        transition: ease 0.1s;
        opacity: 0;
        padding-bottom: 0;
      }
    }
  }
</style>
