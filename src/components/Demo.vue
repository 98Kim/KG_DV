<template>
  <div>
    <!--上边栏-->
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
        <el-autocomplete v-model="place_holder"  size="mini" :fetch-suggestions="query_search" placeholder="请输入要查找的节点" @select="handle_select" :debounce="0" :trigger-on-focus="false" clearable @clear="blur_for_bug()">
          <div><span>更多</span></div>
          <template slot-scope="{item}" > <!--搜索时，下拉菜单中的推荐的格式-->
            <div style="height:45px margin-top:10px">
              <div class="name" v-bind:style="{color: color_dict[item.data.type]}" >{{ item.value }}</div>
              <div class="type"><span>{{ item.data.type }}</span></div>
            <hr/>
            </div>
          </template>
        </el-autocomplete>
      </div>
      
      <!-- 根据路径选择的不同，上边栏显示的内容也有所不同  -->
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
        <el-checkbox-group v-model="node_checkList"  @change="tree_change_data">
          <el-checkbox v-for="thisItem in all_node_types" :key="thisItem" :label="thisItem"/>
        </el-checkbox-group>
      </div>
    </div>
    
    <!-- 图显示部分-->
    <div style="margin-top:0px;width: calc(100% - 10px);height:calc(100vh - 200px);" @click="isShowNodeMenuPanel = false; isShowNodeTipsPanel = false" >
      <!-- relation-graph组件设定 -->
      <SeeksRelationGraph
        ref="seeksRelationGraph"
        :options="graph_op"
        :on-node-click="onNodeClick"
        :on-line-click="onLineClick"
        :on-node-expand="onNodeExpand"
      > 
      </SeeksRelationGraph>
      <!--原来的，点击节点后跳出的操作菜单，现已被注释，不会显现-->
      <div v-show="isShowNodeMenuPanel" :style="{left: nodeMenuPanelPosition.x + 'px', top: nodeMenuPanelPosition.y + 'px' }" style="z-index: 999;padding:10px;background-color: #ffffff;border:#eeeeee solid 1px;box-shadow: 0px 0px 8px #cccccc;position: absolute;">
        <div style="line-height: 25px;padding-left: 10px;color: #888888;font-size: 12px;">操作：</div>
        <div class="c-node-menu-item" @click.stop="doAction('details')">节点详情</div>
        <div class="c-node-menu-item" @click.stop="doAction('setRoot')">设为根节点</div>
      </div>
    </div>
    <!--原来的，详情显示，显示node.data中的全部内容（可根据需要进行更改），现已被注释，不会显现-->
    <div v-if="isShowNodeTipsPanel" :style="{left: nodeMenuPanelPosition.x + 'px', top: nodeMenuPanelPosition.y + 'px' }" style="z-index: 999;padding:10px;background-color: #ffffff;border:#eeeeee solid 1px;box-shadow: 0px 0px 8px #cccccc;position: absolute;">
      <div style="line-height: 25px;padding-left: 10px;color: #888888;font-size: 15px;text-align:left" v-for="(v, k) in current_node.data" :key="k" :label="k">{{k}}:{{v}}</div>
    </div>
  </div>
</template>

<script>
//由于更改了部分relation-graph源码，现从本地的路径引入。
import SeeksRelationGraph from '../../relation-graph/index.js' 
export default {
  name: 'SeeksRelationGraphDemo',
  components: {SeeksRelationGraph},
  data() {
    return {
      isShowNodeMenuPanel: false,                         //当对节点进行点击出现操作界面时的属性//
      isShowNodeTipsPanel: false,                         //       现根据需求，已被注释        //
      nodeMenuPanelPosition: { x: 0, y: 0 },              //       目前的版本用不到           //

      current_node: {},   //当前点击节点
      root_node: {},      //根节点的数据，不是获得图中根节点的对象
      route:'/graph',     //基本等同于this.$route.path。特殊处: route绑定了 布局的图状和树状加载按钮，如果访问/ 则默认为/graph
      node_checkList:[],  //打钩的节点类别
      all_node_types:[],  //所有节点的类别，树形布局时，不会检测根本身的类别，且实际存储为[Product(num),...],num为一共有多少个该类的邻节点。图状存储没有num[Product]
      rel_checkList: [],  //打钩的边类别
      all_rel_type: [],   //所有边类别
      links_id: [],       //自定义的一个边id数组，用途为防止重复边的加载，id=fromid + toid
      last_checklist: [], //树形布局时，上一次的选中值，用于判断某类别节点的显示和隐藏
      place_holder: '',   //搜索框的placeholder
      load_num: 6,        //一次加载的节点数，当待加载数大于load_num时，会逐步进行加载，目前图和树的逐步加载都是6。
      data_buffer: {}, // 当搜索某一节点相连的所有节点和边时，一次性将数据放到这里。格式为 {'节点id':{'相邻节点类型':[ [[node1,edge1],[node2,edge2],...],   from]}}
                       // 其中from为该从哪里继续加载节点和边，初始为0。node和edge成对出现(因为edge的另一侧是节点id)
      all_colors: [
        '#ff6900',//orange500 富途设计中台颜色色号
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
      color_dict : {}, //颜色字典，每一种节点类别对应不同的颜色，现逻辑为在parse节点时，自动根据节点的类别是否存在字典中进行颜色加载。按照all_colors中的顺序，目前支持11类。
      //树、图布局，详情请查文档
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
      //路径变化时，初始一些数据的存储
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
      this.color_dict = {}

      if(this.$route.path == '/'){this.route = '/graph'} // 当路径为/，默认选中图状按钮 
      this.set_layout(this.route)
      this.get_query_nodes(search)
      .then(res=>{
        var root
        // res实为一个nodes数组，返回符合查询search的所有节点
        // 如下是判断选中哪个为根节点的逻辑，可根据需求进行更改
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
          this.root_node = root
          var __graph_json_data = {'rootId':root['id'], 'nodes':[root], links:[]}
          this.$refs.seeksRelationGraph.setJsonData(__graph_json_data, (seeksRGGraph) => {
            var root = this.$refs.seeksRelationGraph.getNodeById(this.root_node.id) //获取图中根节点对象
            root['expanded'] = true 
            this.get_data_from(this.root_node.data.type, this.root_node.id)
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
      this.$router.push({
          path: this.route,
          query:{root:this.root_node.text,
                 type:this.root_node.data.type
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
      node['data']['need_load'] = true
      //根据color_dict设置节点的颜色
      if(node['data']['type'] in this.color_dict){
        node.color = this.color_dict[node['data']['type']]
      }else{
        node.color = this.all_colors[Object.keys(this.color_dict).length]
        this.color_dict[node['data']['type']] = node.color
      }
      //把从后端返回的节点的attributes放入前端的data中，作为详情的显示内容
      for(var key in node_info['attributes']){
        if(key == 'name'){continue}
        node['data'][key] = node_info['attributes'][key]
      }
      return node
    },

    //
    parse_edge(edge_info){
      var link = {}
      //查看该边是否加载过，防止重复，若重复返回{}
      if(this.links_id.includes(edge_info['from_id'] + edge_info['to_id'])){
        return link
      }else{
        this.links_id.push(edge_info['from_id'] + edge_info['to_id'])
      }
      link['from'] = edge_info['from_id']
      link['to'] = edge_info['to_id']
      //后端返回的边都有e_type，此处默认显示e_type
      //若该边有business在attributes中，优先显示business
      link['text'] = edge_info['e_type']
      if ('business' in edge_info['attributes']){
        link['text'] = edge_info['attributes']['business']
      }
      link['data'] = {}
      link['data']['type'] = edge_info['e_type']
      return link
    },

    //异步方法，根据节点的id，类型查询其相连的所有节点和边，解析好后并返回
    //这里通过后端数据库给的api进行查询，目前给的就是这个格式。
    //使用时需要 this.get_nodes_links(type, id).then(res=>{ 后续的操作 }), res是这个函数的返回值
    async get_nodes_links(type, id){
      var query = ''
      //目前后端的api，要根据id和type查询
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
    
    //在搜索推荐菜单中选中，实现路径跳转
    handle_select(item) {
      this.$router.push({
          path: this.route,
          query:{root:item.text,
                 type:item.data.type
          }
      })
    },
    
    //清空搜索框
    blur_for_bug(){
      document.activeElement.blur()
    },

    //当点击节点时调用
    onNodeClick(nodeObject, $event) {
      this.current_node = nodeObject
      if(this.current_node.text.indexOf('加载剩余') != -1){
        //当点击的节点为加载节点时
        var from_id = this.current_node.id.slice(0, this.current_node.id.indexOf('load_all')) 
        var remain = this.count_all_remain(from_id)
        if(this.route == '/tree'){
          //当布局为tree时，remain为！选中！的type还共能加载多少个
          var key_list = this.get_selected_types()
          remain = 0
          for (var i=0; i<key_list.length;i++){
            remain += this.count_type_remain(from_id,key_list[i])
          }
        }else{
          var key_list = Object.keys(this.data_buffer[from_id])
        }
        if(remain <= this.load_num){
          //剩余节点可一次性加载完
          this.$refs.seeksRelationGraph.removeNodeById(this.current_node.id)
          this.data_loader(from_id, remain, key_list)
        }else{
          //剩余节点不可一次性加载完
          this.data_loader(from_id, this.load_num, key_list)
          .then(res=>{
            this.remain_node_change(this.current_node.id, from_id,key_list)
          })
        }                
      }else{
        //当点击节点为正常节点时，重设根节点，实现路径跳转
        this.$router.push({
          path: this.route,
          query:{root:this.current_node.text,
                 type:this.current_node.data.type
          }
        })
        //原版本，点击后出现操作栏
        /*  
        var _base_position = this.$refs.myPage.getBoundingClientRect()
        console.log('showNodeMenus:', $event, _base_position)
        this.isShowNodeMenuPanel = true
        this.nodeMenuPanelPosition.x = $event.clientX - _base_position.x
        this.nodeMenuPanelPosition.y = $event.clientY - _base_position.y
        console.log('onNodeClick:', nodeObject)*/
      }
    },
    
    
    //处理"加载剩余节点"变化
    remain_node_change(remain_id, to_load_id, type_list){
      var load = this.$refs.seeksRelationGraph.getNodeById(remain_id) //获取“加载剩余”的节点对象
      var count = 0 
      // 计算要加载的节点，type_list中的类，还可以加载多少个
      for(var i=0; i<type_list.length; i++){
        count += this.count_type_remain(to_load_id, type_list[i])
      }
      if(count > 0){
        load.isHide = false
        load.text = '加载剩余('+count+')'
      }else{
        load.isHide = true
      }
    },
    
    //点击边调用
    onLineClick(lineObject, $event) {
      console.log('onLineClick:', lineObject)
    },
    

    //原版本，点击节点后出现操作菜单、显示详情等函数
    /*
    showNodeTips(nodeObject) {
      this.current_node = nodeObject
      var _base_position = this.$refs.myPage.getBoundingClientRect()
      console.log('showNodeMenus:', _base_position)
      this.isShowNodeTipsPanel = true
    },
    showNodeMenus(nodeObject, $event) {
      this.current_node = nodeObject
      var _base_position = this.$refs.myPage.getBoundingClientRect()
      console.log('showNodeMenus:', $event, _base_position)
      this.isShowNodeMenuPanel = true
      this.nodeMenuPanelPosition.x = $event.clientX - _base_position.x
      this.nodeMenuPanelPosition.y = $event.clientY - _base_position.y
    },
    
    doAction(actionName) {
      if(actionName == 'details'){
        this.isShowNodeMenuPanel = false
        this.showNodeTips(this.current_node)
      }
      if(actionName == 'setRoot'){
        this.isShowNodeMenuPanel = false
        this.$router.push({
          path: this.route,
          query:{root:this.current_node.text,
                 type:this.current_node.data.type
          }
        })
      }
    },*/
    
    //把查询得到的相邻的节点和边放入data_buffer
    async load_data_to_buffer(type,id){
      var buffer = {}
      var type_dict = {} // id -> node_type
      await this.get_nodes_links(type, id).then(res=>{
        var nodes = res['nodes']
        var edges = res['edges']
        if(nodes.length == 0){return}   
        //节点放入buffer
        for(var i=0; i < nodes.length; i++){
          var key = nodes[i].data.type
          type_dict[nodes[i].id] = key
          if(key in buffer){
            buffer[key][0].push([nodes[i]])
          }else{
            buffer[key] = [[[nodes[i]]],0]
          }
        }
        //边放入buffer
        for(var j=0; j < edges.length; j++){
          var neighbor_id 
          if(edges[j]['from'] == id){
            neighbor_id = edges[j]['to']
          }else{
            neighbor_id = edges[j]['from']
          }
          if(neighbor_id == undefined){continue} //edge为{}
          for(var k=0; k < buffer[type_dict[neighbor_id]][0].length; k++){
            if(buffer[type_dict[neighbor_id]][0][k][0].id == neighbor_id){
              buffer[type_dict[neighbor_id]][0][k].push(edges[j])
              break
            }
          }
        }
        //删除 [node,]的情况，由于重复边会parse返回为{}，不删除这种情况会出错误。正常情况为[node,edge]对应
        for(var key in buffer){
          var tmp = []
          for(var i=0; i<buffer[key][0].length; i++){
            if(buffer[key][0][i].length == 2){
              tmp.push(buffer[key][0][i])
            }
          }
          buffer[key][0] = tmp
        }
        this.data_buffer[id] = buffer
      })
    },

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

    //key_list 为一个节点类别数组，从这些类里中，加载共num个与id相连的节点，加载的方式是尽量让每种类别数目均衡
    // !!!!!!由于该函数包括while循环，调用时务必保证num要小于能加载的数量
    async data_loader(id, num, key_list){
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
    
    //从data_buffer中，加载num个与id相连的类型为type的节点
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
    
    //从后端获取数据,并处理显示相邻节点逻辑
    async get_data_from(type,id){
      //获取数据，放入buffer
      await this.load_data_to_buffer(type, id)
      var remain = this.count_all_remain(id)
      var key_list = Object.keys(this.data_buffer[id])
      //显示相邻节点逻辑
      if(remain <= this.load_num){
        await this.data_loader(id, remain, key_list)
      }else{
        var left = remain-this.load_num
        await this.data_loader(id,this.load_num, key_list)
        var load_more = {'nodes':[{'id':id + 'load_all', 'text':"加载剩余("+left+')', data:{'type':'加载'}, 'color':'white', borderColor: 'black'}],
                         'links':[{'from':id, 'to':id + 'load_all', 'text':'加载'}]}
        this.$refs.seeksRelationGraph.appendJsonData(load_more, (seeksRGGraph) => {})
      }
      //更新筛选显示数据
      if(this.route == '/graph'){
        this.refresh_types()
      }else{
        var types = Object.keys(this.data_buffer[id])
        for(var i=0; i<types.length;i++){
          var tmp = this.get_all_num_by_type(types[i])
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
    
    //筛选节点和边
    //处理逻辑为透明度和隐藏
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
    
    //点击节点展开按钮
    onNodeExpand(node) {
      if(node.data.need_load){
        node.data.need_load = false
        this.get_data_from(node.data.type, node.id)         
      }else{
        this.$refs.seeksRelationGraph.refresh()
      }
    },
//------------------------------------------------------------------------------树形界面涉及函数-----------------------------------------------------------------------------------
    //用于树形布局中，筛选type的()中显示。标志该类别相邻节点一共多少个
    get_all_num_by_type(name){
      var len = this.data_buffer[this.root_node.id][name][0].length
      return name + '(' + len + ')'
    },
    
    //树形布局，当筛选打钩变化时调用
    tree_change_data(value){
      //获得需要变化的type
      var diff = value.concat(this.last_checklist).filter(v => !value.includes(v) || !this.last_checklist.includes(v)) //差集
      var change = diff[0].substr(0,diff[0].indexOf('('))
      var isHide = true
      var key_list = this.get_selected_types()
      if(value.length > this.last_checklist.length) {isHide = false} 
      var all_nodes = this.$refs.seeksRelationGraph.getNodes()
      for(var i=0; i<all_nodes.length; i++){
        //加载剩余的节点进行变化
        if(all_nodes[i].id == this.root_node.id +'load_all'){
          this.remain_node_change(all_nodes[i].id, this.root_node.id, key_list)
        }
        //对变化的type的节点进行显现、隐藏操作
        if(all_nodes[i].data.type == change){
          if(all_nodes[i].id == this.root_node.id){
            all_nodes[i].isHide = false
          }else{
            all_nodes[i].isHide = isHide
          }
        }
      }
      this.last_checklist = value
      this.$refs.seeksRelationGraph.refresh()
    },
    
    //树形布局中，获取选中的type的数组
    //由于node_checkList实际存的是 type(num)，需此函数获得type
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


