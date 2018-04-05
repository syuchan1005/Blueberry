// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue';
import VueMaterial from 'vue-material';
import Notifications from 'vue-notification';
import velocity from 'velocity-animate';
import axios from 'axios';

import 'vue-material/dist/vue-material.min.css';
import 'vue-material/dist/theme/default.css';
import 'material-design-icons/iconfont/material-icons.css';

import titleMixin from './module/titleMixin';
import App from './App';
import router from './router';
import store from './store';
import i18n from './i18n';

Vue.config.productionTip = false;
Vue.prototype.$http = axios;
Vue.mixin(titleMixin);
Vue.use(VueMaterial);
Vue.use(Notifications, { velocity });

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  store,
  i18n,
  template: '<App/>',
  components: { App },
});

