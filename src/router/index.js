import Vue from 'vue';
import Router from 'vue-router';
import Hello from '@/components/Hello';
import User from '@/components/User';
import Photos from '@/components/Photos';

Vue.use(Router);

export default new Router({
  mode: 'history',
  routes: [
    {
      path: '/',
      name: 'Hello',
      component: Hello,
    },
    {
      path: '/user',
      name: 'User',
      component: User,
    },
    {
      path: '/photos',
      name: 'Photos',
      component: Photos,
    },
  ],
});
