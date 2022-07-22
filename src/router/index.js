import Vue from 'vue'
import Router from 'vue-router'
import Demo from '@/components/Demo'
import Element from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'


Vue.use(Element)
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/graph',
      name: 'graph',
      component: Demo
    },
    {
      path: '/tree',
      name: 'tree',
      component: Demo
    },
    {
      path: '/',
      name: 'main',
      component: Demo
    }
  ]
})
