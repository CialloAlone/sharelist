/*
 * 91
 */

const name = '91'

const version = '1.0'

const protocols = ['91']

const defaultProtocol = '91'

const host = Buffer.from('aHR0cDovL3d3dy45MXBvcm4uY29t', 'base64').toString('binary')

const base64decode = v => Buffer.from(v, 'base64').toString('binary')

const base64encode = v => Buffer.from(v).toString('base64')

// 返回 { name , protocols, folder , file }
const cache = {}

module.exports = ({request , decode , getSource}) => {
  
  const pageSize = 100

  const min = (a , b) => (a < b ? a : b)

  const cats = [
    {id:'/default',cat:'default',name:'默认'},
    {id:'/rp',cat:'rp',name:'最近得分'},
    {id:'/rf',cat:'rf',name:'最近加精'},
    {id:'/hot',cat:'hot',name:'当前最热'},
    {id:'/top',cat:'top',name:'本月最热'},
    {id:'/tf',cat:'tf',name:'本月收藏'},
    {id:'/mf',cat:'mf',name:'收藏最多'},
    {id:'/md',cat:'md',name:'高清'},
  ]
  //cate_page_viewkey

  const mount = () => {
    return {
      id : '/',
      type : 'folder',
      protocol:defaultProtocol,
      updated_at:Date.now(),
      children : cats.map(i=>{
        return {id:i.id , name:i.name , type:'folder',protocol:defaultProtocol}
      })
    }
  }

  const getNameByCate = (cate) => {
    let hit = cats.find( i => i.cat == cate)
    if( hit ){
      return hit.name
    }else{
      return '默认'
    }
  }

  const getCateByName = (cateName) => {
    let hit = cats.find( i => i.name == cateName)
    if( hit ){
      return hit.cat
    }else{
      return 'default'
    }
  }

  const getDetail = async (viewkey) => {

    let { body } = await request.get(`${host}/view_video.php?viewkey=${viewkey}`, {fake:true})

    let url = (body.match(/source\s*src\s*=\s*"([^"]+)/) || ['',''])[1]
    let name =(body.match(/viewvideo-title">([^<]+)/) || ['',''])[1].replace(/[\r\n]/g,'').replace(/(^[\s]*|[\s]*$)/g,'')
    

    return {
      id:'/f/'+viewkey,
      name:name+'.mp4',
      type:'video',
      ext:'mp4',
      mime:'video/mp4',
      protocol:defaultProtocol,
      url:url
    }
  }

  const getCate = (value) => {
    let cate = getCateByName(value)
    //console.log( 'get cdate' , { id: cate + '/' + page ,  name:value})
    return getMock( { id: '/' + cate ,  name:value})
  }

  const getRange = async (id , name) => {
    let [,cate,start] = id.split('/')
    let { body } = await request.get(`${host}/v.php?page=1&category=${cate}`)
    let pageCount = parseInt(body.match(/(?<=page=\d+\">)[\d]+/g).pop() || 0)

    cache[`${cate}_page`] = pageCount

    console.log( pageCount )
    start = parseInt(start || 1)
    end = Math.ceil( pageCount / 100 )

    console.log( start , end)
    //每100页 做一次分页

    return {
      id:'-1',
      name:'name',
      type:'folder',
      protocol:defaultProtocol,
      children:new Array(end).fill(1).map((i , index) => {
        return {
          id : `/${cate}/${start}`, 
          name : `第${start + pageSize*(index)}-${ min((start + pageSize*(index+1) - 1) , pageCount)}页`,
          protocol:defaultProtocol,
          updated_at:'-',
          size:'-',
          type:'folder',
        }
      })
    }

  }

  const getRangePage = (id , start) => {
    let [,cate,rangeStart] = id.split('/')
    
    rangeStart = parseInt( rangeStart || 1)
    let rangeEnd = cache[`${cate}_page`]
    let range = min( rangeEnd - rangeStart + 1 , pageSize)

    return {
      id:'-1',
      name:'-1',
      type:'folder',
      protocol:defaultProtocol,
      children:new Array(range).fill(1).map((i , index) => {
        return {
          id : `/${cate}/${rangeStart}/${index}`, 
          name : `第${rangeStart + index}页`,
          protocol:defaultProtocol,
          updated_at:'-',
          size:'-',
          type:'folder',
        }
      })
    }
  }

  const getMock = (opts) => {
    let child = {id:'' , name: '',  type:'folder', protocol:defaultProtocol } 
    for( let  i in opts ){
      child[i] = opts[i]
    }

    return {
      id : '-1',
      type : 'folder',
      protocol:defaultProtocol,
      updated_at:Date.now(),
      children : [ child ]
    }
  }

  const getList = async (id) => {
    let [,cate,page] = id.split('/')
    if(!page) page = 1
    page = parseInt(page)
    let { body } = await request.get(`${host}/v.php?page=${page}&category=${cate}`)
    let children = []
    console.log( `${host}/v.php?page=${page}&category=${cate}` )
    let pageCount = parseInt(body.match(/(?<=page=\d+\">)[\d]+/g).pop() || 0)

    body.replace(/viewkey=([0-9a-z]+)[^<]+?\s*<img\s+src="([^"]+?)"[\w\W]+?title="([^"]+?)"/g , ($0 , $1, $2, $3)=>{
      children.push({
        id : `/${cate}/${page}/${$1}`, 
        name : $3+'.mp4',
        url: `./${$1}/${$3}.mp4`,
        protocol:defaultProtocol,
        updated_at:'-',
        size:'-',
        type:'video',
        ext:'mp4'
      })
      return ''
    })

    return {
      id : '/'+cate+'/'+page,
      type : 'folder',
      protocol:defaultProtocol,
      updated_at:Date.now(),
      children
    }
  }


  /**
   * id:
   * case 0: /
   * case 1: /cate
   * case 2: /cate/range
   * case 3: /cate/range/page
   * case 4  /cate/range/page/viewkey
   *
   * path
   * case a /cate
   * case b /cate/range
   * case c /cate/range/page
   * case d /cate/range/page/viewkey
   * case e /cate/range/page/viewkey/videoname.mp4
   */
  const folder = async(id , {paths}) => {

    //后续路径

    ///const data = decode(id)

    const lv = id == '/' ? 0 : id.substring(1).split('/').length

    const direct = paths.length == 0

    const len = paths.length

    const value = paths[0]

    console.log('***' , lv,id , paths)

    // case 0
    if( lv == 0 ){
      if( len == 0 ){
        return mount() 
      }
      // case b , c , d => mock
      else { 
        return getCate(decodeURIComponent(decode(value)))
      }
    }

    // case 1 /cate <---> case a , c
    else if( lv == 1 ){
      //case a
      if( len == 0 ){
        return await getRange( id  , value )
        // return await getList( id + '/1' )
      }
      // case c , paths = [range]
      else{
        return await getRange( id + '/' + decodeURIComponent(decode(value)).replace(/第(\d+)-(\d+)页/,'$1') ,  value)
      }
    }

    // case 2 /cate/range
    else if( lv == 2 ){
      // case b
      if( len == 0){
        return await getRangePage( id  , 0)
      }
      
      else {
        return await getRangePage( id  ,  decodeURIComponent(decode(value)).replace(/第(\d+)页/,'$1'))
      }
    }
    // case 2 /cate/range
    else if( lv == 3 ){
      // case b
      if( len == 0){
        return await getList( id  )
      }
      // case d
      else {
        return await getMock( {id : id + '/' + value,  name:value} )
      }
    }
    // case 3
    else if( lv == 4 ){
      //不会存在此情况
      if( len == 0 ){
        
      }
      // case d , paths = [ videoname ]
      else if( len == 1){
        return getMock( {
          id : id + '/f' ,  
          name:decodeURIComponent(decode(value)),
          ext:'mp4' ,
          mime:'video/mp4', 
          type:'video'
        })
      }

    }

    return []
  }

  /**
   * /f/viewkey
   */
  const file = async(id) =>{
    let viewkey = id.split('/').slice(-2,-1)
    if(viewkey){
      let resp = await getDetail( viewkey )
      return resp
    }else{
      return false
    }
  }

  return { name , version, drive : { protocols, folder , file } }
}