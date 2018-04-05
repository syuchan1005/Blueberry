/* eslint-disable no-param-reassign */

import Vue from 'vue';
import Vuex from 'vuex';
import createPersistedState from 'vuex-persistedstate';

Vue.use(Vuex);

export default new Vuex.Store({
  plugins: [createPersistedState()],
  state: {
    openAlbum: {},
    auth: false,
  },
  mutations: {
    setOpenAlbum(state, album) {
      state.openAlbum = album;
    },
    setAuth(state, data) {
      state.auth = data;
    },
  },
});
