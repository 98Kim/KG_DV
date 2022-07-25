// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.


import Vue from 'vue'
import App from './App'
import router from './router'
import axios from 'axios'

Vue.config.productionTip = false
Vue.prototype.$axios = axios

axios.defaults.baseURL = '/Industry_graph' //这个路径会在config/index.js 中进行跨域访问，用于本地开发时。

//打包部署用这一句
//axios.defaults.baseURL = '/api/query/Industry_graph/'
//服务器配置上有api这个路径做跨域访问

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})


