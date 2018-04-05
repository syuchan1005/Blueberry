<template>
  <div class="album">
    <md-card @click.native="$emit('click', $event)">
      <div class="icon" v-if="icon">
        <md-icon>{{ icon }}</md-icon>
      </div>

      <md-card-media-cover>
        <md-card-media md-ratio="1:1">
          <img :src="sources[0]"/>
        </md-card-media>

        <md-card-area>
          <md-card-header>
            <span class="md-title">{{ title }}</span>
            <span class="md-subhead" v-if="count !== undefined">{{ $tc('photo', count, { count }) }}</span>
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
    <div class="back">
      <md-card>
        <md-card-media-cover>
          <md-card-media md-ratio="1:1">
            <img :src="sources[1]"/>
          </md-card-media>
        </md-card-media-cover>
      </md-card>
      <md-card>
        <md-card-media-cover>
          <md-card-media md-ratio="1:1">
            <img :src="sources[2]"/>
          </md-card-media>
        </md-card-media-cover>
      </md-card>
    </div>
  </div>
</template>

<script>
  export default {
    name: 'Album',
    /*
    events: [
      click
    ]
    */
    props: {
      title: {
        type: String,
        default: 'No Title',
      },
      count: {
        type: Number,
        default: undefined,
      },
      sources: {
        type: Array,
        default: () => [],
      },
      icon: {
        type: String,
        default: undefined,
      },
    },
  };
</script>

<style lang="scss" scoped>
  @import "../../general";

  $size: 200px;

    .album {
      position: relative;

      padding: $size / 10;
      width: $size * 1.2;
      height: $size * 1.2;

      .md-card {
        position: absolute;

        z-index: 2;
        width: $size;
        height: $size;
        background-color: $background-color;
        border: solid 1px $border-color;
        box-shadow: none;
        margin: 0;

        .md-card-header {
          padding: 0 0 8px 16px;
          margin: 16px 0 8px;
          background-color: rgba(darken($sub-color, 10), 0.7);
        }

        .icon {
          z-index: 5;

          position: absolute;

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

        .menu-button {
          position: absolute;
          right: 0;
          bottom: 6px;
        }
      }

    .back {
      position: relative;

      .md-card {
        transition: ease 0.2s;

        &:nth-child(1) {
          z-index: 1;
          position: absolute;
          background-color: $warning-color;
        }

        &:nth-child(2) {
          z-index: 0;
          position: relative;
          background-color: $error-color;
        }
      }
    }

    &:hover {
      .md-card {
        border-color: $dark-primary-color;
      }

      .back .md-card {
        &:nth-child(1) {
          transform: rotate(5deg) translateY($size / 25 * -1) translateX(round($size / 17));
        }

        &:nth-child(2) {
          transform: rotate(-2deg) translateY($size / 20) translateX(round($size / 17 * -1));
        }
      }
    }
  }
</style>
