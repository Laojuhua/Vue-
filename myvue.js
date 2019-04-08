class KVue {
    constructor(options){
        this.$data = options.data;
        this.$options = options;
        //处理数据 让他成为响应式
        this.observer(this.$data)
        //编译模板
        if(options.created){
            options.created.call(this)
        }
        this.$compile = new Compile(options.el,this)
    }
    observer(value){
        Object.keys(value).forEach(key=>{
            this.proxyData(key)
            this.defineReactive(value,key,value[key])
        })
    }
    proxyData(key){
        Object.defineProperty(this,key,{
            get(){
                return this.$data[key]
            },
            set(val){
                this.$data[key] = val
            }
        })  
    }
    defineReactive(obj,key,value){
        //data中的每个key都有一个依赖来管理
        const dep = new Dep()
        Object.defineProperty(obj,key,{
            get(){
                //  添加依赖
                Dep.target && dep.addDep(Dep.target)
                return value
            },
            set(newVal){
                if(newVal == value) return
                value = newVal
                console.log('modified')
                dep.notify()
            }
        })
    }
}

class Compile {
    //模板编译
    constructor(el,vm){
        this.$vm = vm //this
        this.$el = document.querySelector(el)
        if(this.$el){
            //1把内部Html内容取出
            this.$fragment = this.node2Fragment(this.$el)
            console.log(this.$fragment)
            //2挨个遍历编译内容{{}} k-textk-model数据替换，并做双向绑定
            this.CompileElement(this.$fragment)
            //3把数据解析后的dom结构放回el中
            this.$el.appendChild(this.$fragment)
        }
    }
    node2Fragment(el){
        let fragment = document.createDocumentFragment()
        let child
        while(child = el.firstChild){
            
            fragment.appendChild(child)
        }
        return fragment
    }

    //编译模板
    CompileElement(el){
        let childNodes = el.childNodes
        Array.from(childNodes).forEach(node=>{
            //  console.log(node)
             let text = node.textContent
             //{{}}
             let reg = /\{\{(.*)\}\}/
             //k- @
             if(this.isElementNode(node)){
                this.compile(node)
             }else if(this.isText(node) && reg.test(text)){
                this.compileText(node,RegExp.$1)
             }

             if(node.childNodes && node.childNodes.length){
                 this.CompileElement(node)
             }
        })
    }
    compile(node){
        let nodeAttrs =node.attributes
        Array.from(nodeAttrs).forEach(attr=>{
            let attrName = attr.name
            let attrValue = attr.value
            if(this.isDirective(attrName)){
                //过滤k-
                let dir = attrName.substring(2)
                // console.log(123,dir)
                this[dir] && this[dir](node,this.$vm,attrValue)
            }
            if(this.isEventDirective(attrName)){
                let dir = attrName.substring(1)
                this.eventHandler(node,this.$vm,attrValue,dir)
            }
            // console.log(attrName,attrValue)
        })
    }
    eventHandler(node,vm,attrValue,dir){
        let fn = vm.$options.methods[attrValue]
        if(fn){
            node.addEventListener(dir,fn.bind(vm),false)
        }
    }
    text(node,vm,attrValue){
        //修改 && 加依赖收集和监听器
        this.update(node,vm,attrValue,'text')
    }
    html(node,vm,attrValue){
        this.update(node,vm,attrValue,'html')
    }
    model(node,vm,attrValue){
        this.update(node,vm,attrValue,'model')
        //监听input实现双向绑定
        node.addEventListener('input',e=>{
            let newValue = e.target.value
            vm[attrValue] = newValue
            // val = newValue
        })
    }
    update(node,vm,attrValue,dir){
        let updateFN = this[dir+'Updatar']
        updateFN && updateFN(node,vm[attrValue])
        //添加监听器
        new Watcher(vm,attrValue,function(value){
            // 数据修改执行，执行后的callback
            updateFN && updateFN(node,value)
        })
    }
    textUpdatar(node,value){
        node.textContent = value
    }
    htmlUpdatar(node,value){
        node.innerHTML = value
    }
    modelUpdatar(node,value){
        node.value = value
    }
    isEventDirective(attrName){
        return attrName.indexOf('@')===0
    }
    isDirective(attrName){
        return attrName.indexOf('k-')===0
    }
    compileText(node,attrValue){
        this.text(node,this.$vm,attrValue)
        console.log(node,attrValue)
    }
    isElementNode(node){
        return node.nodeType == 1
    }
    isText(node){
        return node.nodeType == 3
    }
}


class Dep { //依赖收集
    constructor(){
        this.deps = []
    }
    addDep(dep){
        this.deps.push(dep)
    }
    notify(){//数据修改通知依赖
        this.deps.forEach(dep=>{
            dep.update()
        })
    }
}
Dep.target = null
//每个dep都是一个监听器

// new Watcher(vm,attrValue,function(value){
//     // 数据修改执行，执行后的callback
//     updateFN && updateFN(node,value)
// })

class Watcher {
    constructor(vm,key,cb){
        this.vm = vm
        this.key = key
        this.cb = cb
        this.value = this.get()
    }
    get(){
        Dep.target = this
        let value = this.vm[this.key]
        return value
    }
    update(){
        this.value = this.get()
        this.cb.call(this.vm,this.value)
    }
}