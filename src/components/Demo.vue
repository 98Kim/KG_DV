<template>
  <div>
    <div ref="myPage" style="height:150px; border-bottom: #efefef solid 1px;color: #555555;font-size: 12px;"  >
      <div style="display: inline-block; margin-left:300px ">
        <div style="line-height: 20px; font-size: 16px; margin-right:10px"><b>布局</b></div>
        <el-radio-group v-model="route" size="mini" class="inline-block" @change="change_layout">
          <el-radio-button label="/graph">图状</el-radio-button>
          <el-radio-button label="/tree">树状</el-radio-button>
        </el-radio-group>
      </div>
      
      <div style="float:right; display: inline-block; width:300px">
        <div style="line-height: 20px; font-size: 16px; display: inline-block;"><b>搜索：</b></div>
        <el-autocomplete v-model="place_holder"  size="mini" :fetch-suggestions="query_search" placeholder="请输入要查找的节点" @select="handleSelect" :debounce="0" :trigger-on-focus="false" clearable @clear="blurForBug()">
          <div><span>更多</span></div>
          <template slot-scope="{item}" >
            <div style="height:45px margin-top:10px">
              <div class="name" v-bind:style="{ color: colorDict[item.data.type]}"  >{{ item.value }}</div>
              <div class="type"><span>{{ item.data.type }}</span></div>
            <hr/>
            </div>
          </template>
        </el-autocomplete>
      </div>
  
      <div v-if="route =='/graph'" style="margin-top:10px">
        <div v-if="all_node_types.length > 0 " style="line-height: 20px; font-size: 16px;"><b>节点筛选</b></div>
        <el-checkbox-group v-model="node_checkList" @change="doFilter">
          <el-checkbox v-for="thisItem in all_node_types" :key="thisItem" :label="thisItem" />
        </el-checkbox-group>
      </div>


      <div v-if="route =='/graph'" style="margin-top:10px">
        <div v-if="all_rel_type.length > 0" style="line-height: 20px; font-size: 16px;"><b>关系筛选</b></div>
        <el-checkbox-group v-model="rel_checkList" @change="doFilter">
          <el-checkbox v-for="thisItem in all_rel_type" :key="thisItem" :label="thisItem" />
        </el-checkbox-group>
      </div>
      
      <div v-if="route =='/tree'" style="margin-top:30px">
        <div v-if="all_node_types.length > 0" style="line-height: 20px; font-size: 16px;" ><b>筛选</b></div>
        <el-checkbox-group v-model="node_checkList"  @change="setTreeData">
          <el-checkbox v-for="thisItem in all_node_types" :key="thisItem" :label="thisItem"/>
        </el-checkbox-group>
      </div>
      

    </div>
    <div style="margin-top:0px;width: calc(100% - 10px);height:calc(100vh - 200px);" @click="isShowNodeMenuPanel = false; isShowNodeTipsPanel = false" >


      <SeeksRelationGraph
        ref="seeksRelationGraph"
        :options="graph_op"
        :on-node-click="onNodeClick"
        :on-line-click="onLineClick"
        :on-node-expand="onNodeExpand"
      > 
      </SeeksRelationGraph>
      <div v-show="isShowNodeMenuPanel" :style="{left: nodeMenuPanelPosition.x + 'px', top: nodeMenuPanelPosition.y + 'px' }" style="z-index: 999;padding:10px;background-color: #ffffff;border:#eeeeee solid 1px;box-shadow: 0px 0px 8px #cccccc;position: absolute;">
        <div style="line-height: 25px;padding-left: 10px;color: #888888;font-size: 12px;">操作：</div>
        <div class="c-node-menu-item" @click.stop="doAction('details')">节点详情</div>
        <div class="c-node-menu-item" @click.stop="doAction('setRoot')">设为根节点</div>
     </div>
      <el-drawer
      title="node option:"
      direction="rtl"
      size="50%"
      custom-class="c-drawer-window"
      :modal="false"
      :visible.sync="isShowCodePanel"
      :with-header="false"
    >
        <iframe src="/relation-graph-codes/Demo4Logo.html" width="100%" height="100%" frameborder="0" scrolling="auto" style="" />
      </el-drawer>
    </div>
    
    <div v-if="isShowNodeTipsPanel" :style="{left: nodeMenuPanelPosition.x + 'px', top: nodeMenuPanelPosition.y + 'px' }" style="z-index: 999;padding:10px;background-color: #ffffff;border:#eeeeee solid 1px;box-shadow: 0px 0px 8px #cccccc;position: absolute;">
      <div style="line-height: 25px;padding-left: 10px;color: #888888;font-size: 15px;text-align:left" v-for="(v, k) in currentNode.data" :key="k" :label="k">{{k}}:{{v}}</div>
    </div>

  </div>
</template>

<script>
import SeeksRelationGraph from '../../relation-graph/index.js'
export default {
  name: 'SeeksRelationGraphDemo',
  components: { SeeksRelationGraph },
  data() {

    return {
      g_loading: true,
      isShowCodePanel: false,
      isShowNodeMenuPanel: false,
      isShowNodeTipsPanel: false,
      nodeMenuPanelPosition: { x: 0, y: 0 },
      currentNode: {},
      rootNode: {},
      nodes_buffer : {},
      route:'/graph',
      node_checkList:[],
      all_node_types:[],
      rel_checkList: [],
      all_rel_type: [],
      links_id: [],
      last_checklist: [],
      place_holder:'',
      load_num: 6,
      data_buffer: {}, // 当搜索某一节点相连的所有节点和边时，一次性将数据放到这里。格式为 {'节点id':{'相邻节点类型':[ [[node1,edge1],[node2,edge2],...],   from]}    }
                       // 其中from为该从哪里继续加载节点和边，初始为0。node和edge成对出现(因为edge的另一侧是节点id)
      all_colors: [
        '#ff6900',//orange500
        '#788aa0',//grayblue400
        '#478eff',//blue450
        '#ff4a46',//red400
        '#00a843',//green400
        '#f6b900',//yellow300
        '#c084ff',//purple400
        '#7f83ff',//indigo400
        '#f760c2',//pink400
        '#debd85',//gold400
        '#76e9f9' //cyan400
      ],
      colorDict : {},
      graph_op: {
        defaultNodeBorderWidth: 1,
        defaultNodeFontColor: 'black',
        allowSwitchLineShape: true,
        allowSwitchJunctionPoint: true,
        defaultLineShape: 1,
        'layouts': [
          {
            'label': '图状',
            'layoutName': 'force',
            'defaultNodeShape': 0,
            'layoutClassName': 'seeks-layout-center',
            defaultLineShape: 1
          }
        ],
        defaultJunctionPoint: 'border'
      },
      tree_op: {
        defaultNodeBorderWidth: 1,
        allowSwitchLineShape: true,
        allowSwitchJunctionPoint: true,
        defaultLineShape: 1,
        defaultNodeShape: 1,
        defaultNodeFontColor:'black',
        'layouts': [

          {
            'label': '树状',
            'layoutName': 'tree',
            'layoutClassName': 'seeks-layout-center',
            'from': 'left',
            'defaultLineShape': 1,
            'min_per_width': 200,
            'max_per_width': 400,
            'min_per_height': 40,
            'max_per_height': 70
          }
        ],
        defaultJunctionPoint: 'border'
      }
    }
  },
  created() {
  },
  mounted() {
    this.listen_to_set()
  },
  
  //监听路径变化
  watch:{
    '$route': 'listen_to_set'
  },
  methods: {
    //------------------------------------------------------------------------------图树界面公用函数-----------------------------------------------------------------------------------
    
    //当路径变化时，重新加载根节点和对应的数据
    //重新设置根节点时的函数调用实际为更改路径，该函数会自动根据路径变化进行调整
    listen_to_set(){
      var search = this.$route.query.root
      this.place_holder = search
      this.data_buffer = {}
      this.route = this.$route.path
      this.last_checklist = []
      this.links_id = []
      this.node_checkList = []
      this.all_node_types = []
      this.rel_checkList = []
      this.all_rel_type = []

      if(this.$route.path == '/'){this.route = '/graph'}
      this.set_layout(this.route)
      this.get_query_nodes(search)
      .then(res=>{
        var root
        if(res.length == 1){
          root = res[0]
        }else{
          if(res.length > 1){
            for(var i=0; i < res.length; i++){
              if(res[i]['data']['type']== this.$route.query.type && res[i]['text']==search){
                root = res[i]
                break
              }  
            } 
          }
        }
        return root})
      .then(res=>{
        if(res != undefined){
          var root = res
          this.rootNode = root
          var __graph_json_data = {'rootId':root['id'], 'nodes':[root], links:[]}
          this.$refs.seeksRelationGraph.setJsonData(__graph_json_data, (seeksRGGraph) => {
            var root = this.$refs.seeksRelationGraph.getNodeById(this.rootNode.id)
            root['expanded'] = true 
            this.searchFrom(this.rootNode.data.type, this.rootNode.id)
          })
        }
      })
    },

    //根据路径设置布局 图、树
    //具体图树布局设定在tree_op, graph_op中
    set_layout(route){
      var layout
      if(route == '/tree'){
        layout = this.tree_op
      }
      if(route == '/graph'){
        layout = this.graph_op
      }
      if(layout){
        this.$refs.seeksRelationGraph.setOptions(layout, (seeksRGGraph) => {
          //call back, 设置完布局后执行
        })
      }
    },

    //点击布局按钮进行布局路径跳转
    change_layout(){ 
      this.node_checkList = []
      this.all_node_types = []
      this.$router.push({
          path: this.route,
          query:{root:this.rootNode.text,
                 type:this.rootNode.data.type
          }
      })
    },

    //将单个原有的node结构体(后端返回)转换为前端所需要的结构体
    //前端要求格式{'id':, 'text':, 'data':{}, ...}
    //id 和 text为必须项，自定义类别需要放在data字典里，其余节点属性参照文档
    parse_node(node_info){
      var node = {}
      node['expanded'] = false 
      if(this.route == '/graph'){node['expandHolderPosition'] = 'right'}
      node['id'] = node_info['v_id']
      node['text'] = node_info['attributes']['name']
      node['data'] = {}
      node['data']['vid'] = node['id']
      node['data']['type'] = node_info['v_type']
      node['data']['needLoad'] = true
      if(node['data']['type'] in this.colorDict){
        node.color = this.colorDict[node['data']['type']]
      }else{
        node.color = this.all_colors[Object.keys(this.colorDict).length]
        this.colorDict[node['data']['type']] = node.color
      }
      for(var key in node_info['attributes']){
        if(key == 'name'){continue}
        node['data'][key] = node_info['attributes'][key]
      }
      return node
    },

    parse_edge(edgesInfo){
      var link = {}
      if(this.links_id.includes(edgesInfo['from_id'] + edgesInfo['to_id'])){
        return link
      }else{
        this.links_id.push(edgesInfo['from_id'] + edgesInfo['to_id'])
      }
      link['from'] = edgesInfo['from_id']
      link['to'] = edgesInfo['to_id']
      link['text'] = edgesInfo['e_type']
      if ('business' in edgesInfo['attributes']){
        link['text'] = edgesInfo['attributes']['business']
      }
      link['data'] = {}
      link['data']['type'] = edgesInfo['e_type']
      return link
    },

    //异步方法，根据节点的id，类型查询其相连的所有节点和边，解析好后并返回
    //这里通过后端数据库给的api进行查询，目前给的就是这个格式。
    //使用时需要 this.get_nodes_links(type, id).then(res=>{ 后续的操作 }), res是这个函数的返回值
    async get_nodes_links(type, id){
      var query = ''
      switch (type){
        case 'Company':
          query = 'search_company_linked_vertex?C='
          break
        case 'Product':
          query = 'search_product_linked_vertex?C='
          break
        case 'Indicator':
          break
        case 'Topic':
          query = 'search_topic_linked_vertex?C='
          break
        case 'Industry':
          query = 'search_industry_linked_vertex?C='
          break
      }
      var ret_nodes = []
      var ret_edges = []
      await this.$axios.get(query+id).then(res =>{
        var results = res.data.results
        var nodes_list = results[0]['nodes']
        var edges_list = results[1]['edges']
        for(var i=0; i < nodes_list.length; i++){
          var n = this.parse_node(nodes_list[i])
          ret_nodes.push(n)
        }
        for(var j=0; j < edges_list.length; j++){
          var l = this.parse_edge(edges_list[j])
          ret_edges.push(l)
        }
      }).catch((err) => {
        console.log(err)
      }) 
      return {'nodes': ret_nodes, 'edges': ret_edges}
    },
    
    //异步方法，根据后端API查询符合字符串检索条件的节点数组
    //解析好后返回
    //同上，如后端查询api、返回格式改变，需要改变此函数
    //使用时需要 this.get_query_nodes(query).then(res=>{ 后续的操作 }), res是这个函数的返回值
    async get_query_nodes(query){
      var nodes = []
      await this.$axios.get("search_vertex?s=" + query).then(res =>{
        var results = res.data.results
        for(var i=0; i<results.length; i++){
          for(var j in results[i]){
            for(var k=0; k < results[i][j].length; k++){
              nodes.push(this.parse_node(results[i][j][k]))
            }
          }
        }
      }).catch((err) => {
          console.log(err)
      })
      return nodes
    },

    // 对搜索框的输入内容进行查询，返回匹配数据，形成下拉推荐菜单
    // query是用户输入的想要查询的内容，cb是回调函数,返回数据
    query_search(query, cb) {
      if(query != ''){
        this.get_query_nodes(query).then(res=>{
          var nodes = res
          for(var i=0; i<nodes.length; i++){
            nodes[i]['value'] = nodes[i]['text'] //绑定的是element-ui组件，下拉菜单根据节点的value属性显示内容
          }
          cb(nodes)
        })
      }
    },

    onNodeClick(nodeObject, $event) {
      this.currentNode = nodeObject
      if(this.currentNode.text.indexOf('加载剩余') != -1){
        var from_id = this.currentNode.id.slice(0, this.currentNode.id.indexOf('load_all'))
        var remain = this.count_all_remain(from_id)
        if(this.route == '/tree'){
          var key_list = this.get_selected_types()
        }else{
          var key_list = Object.keys(this.data_buffer[from_id])
        }
        if(remain <= this.load_num){
          this.$refs.seeksRelationGraph.removeNodeById(this.currentNode.id)
          this.graph_data_loader(from_id, remain, key_list)
        }else{
          var left = remain-this.load_num
          this.graph_data_loader(from_id, this.load_num, key_list)
          this.currentNode['text'] = "加载剩余(" + left +')'
        }                
      }else{
        this.$router.push({
          path: this.route,
          query:{root:this.currentNode.text,
                 type:this.currentNode.data.type
          }
        })
        /*  
        var _base_position = this.$refs.myPage.getBoundingClientRect()
        console.log('showNodeMenus:', $event, _base_position)
        this.isShowNodeMenuPanel = true
        this.nodeMenuPanelPosition.x = $event.clientX - _base_position.x
        this.nodeMenuPanelPosition.y = $event.clientY - _base_position.y
        console.log('onNodeClick:', nodeObject)*/

      }
    },

    onLineClick(lineObject, $event) {
      console.log('onLineClick:', lineObject)
    },

    handleSelect(item) {
      this.$router.push({
          path: this.route,
          query:{root:item.text,
                 type:item.data.type
          }
      })
    },
     
    blurForBug(){
      document.activeElement.blur()
    },

    /*
    showNodeTips(nodeObject) {
      this.currentNode = nodeObject
      var _base_position = this.$refs.myPage.getBoundingClientRect()
      console.log('showNodeMenus:', _base_position)
      this.isShowNodeTipsPanel = true
    },
    showNodeMenus(nodeObject, $event) {
      this.currentNode = nodeObject
      var _base_position = this.$refs.myPage.getBoundingClientRect()
      console.log('showNodeMenus:', $event, _base_position)
      this.isShowNodeMenuPanel = true
      this.nodeMenuPanelPosition.x = $event.clientX - _base_position.x
      this.nodeMenuPanelPosition.y = $event.clientY - _base_position.y
    },
    
    doAction(actionName) {
      if(actionName == 'details'){
        this.isShowNodeMenuPanel = false
        this.showNodeTips(this.currentNode)
      }
      if(actionName == 'setRoot'){
        this.isShowNodeMenuPanel = false
        this.$router.push({
          path: this.route,
          query:{root:this.currentNode.text,
                 type:this.currentNode.data.type
          }
        })
      }
    },*/



    async search_from(type,id){
      var buffer = {}
      var type_dict = {} // id -> node_type
      await this.get_nodes_links(type, id).then(res=>{
        console.log(res)
        var nodes = res['nodes']
        var edges = res['edges']
        if(nodes.length == 0){return}   
        for(var i=0; i < nodes.length; i++){
          var key = nodes[i].data.type
          type_dict[nodes[i].id] = key
          if(key in buffer){
            buffer[key][0].push([nodes[i]])
          }else{
            buffer[key] = [[[nodes[i]]],0]
          }
        }
        for(var j=0; j < edges.length; j++){
          var neighbor_id 
          if(edges[j]['from'] == id){
            neighbor_id = edges[j]['to']
          }else{
            neighbor_id = edges[j]['from']
          }
          if(neighbor_id == undefined){continue}
          for(var k=0; k < buffer[type_dict[neighbor_id]][0].length; k++){
            if(buffer[type_dict[neighbor_id]][0][k][0].id == neighbor_id){
              buffer[type_dict[neighbor_id]][0][k].push(edges[j])
              break
            }
          }
        }
        for(var key in buffer){
          var tmp = []
          for(var i=0; i<buffer[key][0].length; i++){
            if(buffer[key][0][i].length == 2){
              tmp.push(buffer[key][0][i])
            }
          }
          buffer[key][0] = tmp
        }
        //
        this.data_buffer[id] = buffer
      })
    },

    //从data_buffer中，加载num个与id相连的类型为type的节点


    // 计算id节点的相邻节点(类型为type)中还有多少没有加载
    count_type_remain(id, type){
      return this.data_buffer[id][type][0].length - this.data_buffer[id][type][1]
    },

    //计算id节点还有多少相邻节点没有加载
    count_all_remain(id){
      var count = 0
      for(var key in this.data_buffer[id]){
        count += this.count_type_remain(id,key)
      }
      return count
    },

    //
    async graph_data_loader(id, num, key_list){
      var remain_to_load = num
      var key_idx = 0
      while(remain_to_load > 0){
        if(this.count_type_remain(id, key_list[key_idx]) > 0){
          await this.load_data_from_buffer(id, key_list[key_idx], 1)
          remain_to_load -= 1
        }
        key_idx = (key_idx + 1) % key_list.length
      }
    },

    async load_data_from_buffer(id, type, num){
      var current = this.data_buffer[id][type]
      var to_load = []
      if(current[1] + num <= current[0].length){
        to_load = current[0].slice(current[1], current[1] + num)
        this.data_buffer[id][type][1] += num
      }else{
        to_load = current[0].slice(current[1], current[0].length)
        this.data_buffer[id][type][1] = current[0].length
      }
      if(to_load == []){return false}
      var nodes = []
      var links = []
      for(var i=0; i<to_load.length; i++){
        nodes.push(to_load[i][0])
        links.push(to_load[i][1])
      }
      await this.$refs.seeksRelationGraph.appendJsonData({'nodes':nodes, 'links':links}, (seeksRGGraph) => {})
    },

    async searchFrom(type,id){
      await this.search_from(type, id)
      var remain = this.count_all_remain(id)
      var key_list = Object.keys(this.data_buffer[id])
      if(remain <= this.load_num){
        await this.graph_data_loader(id, remain, key_list)
      }else{
        var left = remain-this.load_num
        await this.graph_data_loader(id,this.load_num, key_list)
        var load_more = {'nodes':[{'id':id + 'load_all', 'text':"加载剩余("+left+')', data:{'type':'加载'}, 'color':'white', borderColor: 'black'}],
                         'links':[{'from':id, 'to':id + 'load_all', 'text':'加载'}]}
        this.$refs.seeksRelationGraph.appendJsonData(load_more, (seeksRGGraph) => {})
      }
      if(this.route == '/graph'){
        this.refresh_types()
      }else{
        var types = Object.keys(this.data_buffer[id])
        for(var i=0; i<types.length;i++){
          var tmp = this.test(types[i])
          this.all_node_types.push(tmp)
          this.node_checkList.push(tmp)
        }
        this.last_checklist = this.all_node_types
      }
    },
    //------------------------------------------------------------------------------图形界面涉及函数-----------------------------------------------------------------------------------

    //返回当前已加载节点的所有类型，用于节点筛选
    get_all_node_types(){
      var type_dict = {}
      var all_nodes = this.$refs.seeksRelationGraph.getNodes()
      all_nodes.forEach(this_node => {
        if(this_node.data.type in type_dict == false && this_node.data.type!= undefined){
          type_dict[this_node.data.type] = 1
        }
      })
      return Object.keys(type_dict)
    },
    
    //返回当前已加载边的所有类型，用于边筛选
    get_all_rel_types(){
      var type_dict = {}
      var all_links = this.$refs.seeksRelationGraph.getLines()
      //line, link实际不是一个东西，这里参考了文档的调用方法
      all_links.forEach(this_line => {
        this_line.relations.forEach(this_link => {
          if(this_link.text in type_dict == false && this_link.text != ''){
            type_dict[this_link.text] = 1
          }
        })
      })
      return Object.keys(type_dict)
    },
    
    //当图形界面数据更新时调用，获得数据中所有的点、边类型，用于筛选
    refresh_types(){
      var all_node_types = this.get_all_node_types()
      this.node_checkList = all_node_types
      this.all_node_types = all_node_types    
      var all_link_types = this.get_all_rel_types()
      this.rel_checkList = all_link_types
      this.all_rel_type = all_link_types
    },

    doFilter() {
      var _all_nodes = this.$refs.seeksRelationGraph.getNodes()
      var _all_lines = this.$refs.seeksRelationGraph.getLines()
      _all_nodes.forEach(thisNode => {
        var _isHideThisLine = false
        if (this.node_checkList.indexOf(thisNode.data['type']) === -1) {
          _isHideThisLine = true
        }
        thisNode.opacity = _isHideThisLine ? 0.1 : 1
      })
      _all_lines.forEach(thisLine => {
        // 注意这里的line和json数据中link不一样，一条线（line）上可以附着多条关系(link),可以通过line.relations获取到这条线上所有的关系数据(link)
        var _isHideThisLine = true
        thisLine.relations.forEach(thisLink => {
          if (this.rel_checkList.indexOf(thisLink['text']) === -1) {
            thisLink.isHide = true
          } else {
            _isHideThisLine = false
            thisLink.isHide = false
          }
        })
      })
    },
    onNodeExpand(node) {
        if(node.data.needLoad){
          this.g_loading = true
          node.data.needLoad = false
          this.searchFrom(node.data.type, node.id)         
        }else{
          this.$refs.seeksRelationGraph.refresh()
        }
    },

//------------------------------------------------------------------------------树形界面涉及函数-----------------------------------------------------------------------------------

    test(name){
      var len = this.data_buffer[this.rootNode.id][name][0].length
      return name + '(' + len + ')'
    },
    
    setTreeData(value){
      var diff = value.concat(this.last_checklist).filter(v => !value.includes(v) || !this.last_checklist.includes(v))
      var change = diff[0].substr(0,diff[0].indexOf('('))
      var isHide = true
      if(value.length > this.last_checklist.length) {isHide = false}
      var all_nodes = this.$refs.seeksRelationGraph.getNodes()
      var to_load
      for(var i=0; i<all_nodes.length; i++){
        if(all_nodes[i].id == this.rootNode.id +'load_all'){
          var count = 0 
          for(var j=0; j<value.length; j++){
            count += this.count_type_remain(this.rootNode.id, value[j].substr(0,value[j].indexOf('(')))
          }
          if(count > 0){
            all_nodes[i].isHide = false
            all_nodes[i].text = '加载剩余('+count+')'
          }else{
            all_nodes[i].isHide = true
          }
        }
        if(all_nodes[i].data.type == change){
          if(all_nodes[i].id == this.rootNode.id){
            all_nodes[i].isHide = false
          }else{
            all_nodes[i].isHide = isHide
          }
        }
      }
      this.last_checklist = value
      this.$refs.seeksRelationGraph.refresh()
    },

    get_selected_types(){
      var types = []
      for(var i=0; i<this.node_checkList.length; i++){
        types.push(this.node_checkList[i].substr(0,this.node_checkList[i].indexOf('(')))
      }
      return types
    }    
  }
}
</script>
<!-- Add "scoped" attribute to limit CSS to this component only -->
<style lang="scss" scoped>
.c-node-menu-item{
  line-height: 30px;padding-left: 10px;cursor: pointer;color: #444444;font-size: 14px;border-top:#efefef solid 1px;
}
.c-node-menu-item:hover{
  background-color: rgba(66,187,66,0.2);
}
</style>

<style>
  .name {
      font-size: 14px;
      text-overflow: ellipsis;
      overflow: hidden;
      line-height: normal;

  }
  .type {
      font-size: 8px;
      color: #b4b4b4;
      line-height: normal;
  }
  .inline-block {
    display: inline-block;
  } 
</style>


