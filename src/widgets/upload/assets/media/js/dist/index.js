var Me=class{constructor(){this.subscriptions=new Map}subscribe(e,t){let i=this.subscriptions.get(e);return i||(i=[],this.subscriptions.set(e,i)),i.push(t),()=>{let n=i.indexOf(t);n!==-1&&(i.splice(n,1),i.length===0&&this.subscriptions.delete(e))}}publish(e,...t){let i=this.subscriptions.get(e);if(i)for(let n of i)n(...t)}};var Le=class{constructor(e,t,i,n,o,a="AddImageForm",s=3){this.connector=e;this.headers=t;this.galleryState=i;this.dispatcher=n;this.ownerId=o;this.formName=a;this.currentUploads=0;this.uploadQueue=[];this.uploadStatus=[];this.maxConcurrentUploads=s}async uploadAll(){let e=this.galleryState.getUploadEntries();if(e.length===0)throw new Error("\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438");this.uploadStatus=e.map(n=>({uploadId:n.uploadId,fileName:n.file.name,progress:0,status:"pending"}));let t=e.map(n=>this.uploadFileQueued(n.uploadId,n.file).then(()=>({success:!0,fileName:n.file.name})).catch(o=>({success:!1,fileName:n.file.name,error:o instanceof Error?o.message:String(o)}))),i=await Promise.all(t);return{succeeded:i.filter(n=>n.success).length,failed:i.filter(n=>!n.success).map(n=>({fileName:n.fileName,error:n.error}))}}uploadFileQueued(e,t){return new Promise((i,n)=>{this.uploadQueue.push({uploadId:e,file:t,resolve:i,reject:n}),this.processQueue()})}processQueue(){for(;this.currentUploads<this.maxConcurrentUploads&&this.uploadQueue.length>0;){let{uploadId:e,file:t,resolve:i,reject:n}=this.uploadQueue.shift();this.currentUploads++,this.uploadFile(e,t).then(()=>{this.currentUploads--,this.processQueue(),i()}).catch(o=>{this.currentUploads--,this.processQueue(),n(o)})}}uploadFile(e,t){return new Promise((i,n)=>{let o=new XMLHttpRequest,a=new FormData;a.append(`${this.formName}[file]`,t),a.append(`${this.formName}[fileName]`,t.name),a.append(`${this.formName}[id]`,this.ownerId),a.append("method","upload");let s=this.uploadStatus.findIndex(l=>l.uploadId===e);if(s===-1)return n(new Error("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u0445 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438"));o.open("POST",this.connector,!0);for(let[l,d]of Object.entries(this.headers))o.setRequestHeader(l,d);o.upload.onprogress=l=>{if(l.lengthComputable){let d=Math.round(l.loaded/l.total*100);this.updateUploadStatus(s,{progress:d,status:"uploading"})}},o.onload=()=>{if(o.status>=200&&o.status<300)try{let l=JSON.parse(o.responseText);if(l.status==="success")this.updateUploadStatus(s,{progress:100,status:"completed"}),i();else{let d=l.data?.message??l.message??"\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430";this.updateUploadStatus(s,{progress:0,status:"failed",error:d}),n(new Error(d))}}catch{this.updateUploadStatus(s,{progress:0,status:"failed",error:"\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430"}),n(new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430"))}else this.updateUploadStatus(s,{progress:0,status:"failed",error:o.statusText}),n(new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: ${o.status}: ${o.statusText}`))},o.onerror=()=>{this.updateUploadStatus(s,{progress:0,status:"failed",error:"\u0421\u0435\u0442\u0435\u0432\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}),n(new Error("\u0421\u0435\u0442\u0435\u0432\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"))},o.send(a)})}updateUploadStatus(e,t){this.uploadStatus[e]={...this.uploadStatus[e],...t},this.dispatcher.publish("FileUploader:UploadStatusUpdate",this.uploadStatus)}};var ke=class{constructor(e,t,i,n,o){this.model=e;this.view=t;this.service=i;this.fileUploader=n;this.dispatcher=o;this.setupEventListeners()}async init(){this.view.preloaderAction("start");try{this.model.serverImages=await this.service.getImages(),this.view.render(this.model)}catch(e){console.error(e);let t=e instanceof Error?e.message:String(e);this.view.notify({type:"error",title:"\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F",message:t})}finally{this.view.preloaderAction("stop")}}setupEventListeners(){this.dispatcher.subscribe("VIEW.FILES_DROPPED",e=>this.handleFilesAdded(e)),this.dispatcher.subscribe("VIEW.FILES_SELECTED",e=>this.handleFilesAdded(e)),this.dispatcher.subscribe("VIEW.UPLOAD_CLICKED",()=>this.handleUploadClicked()),this.dispatcher.subscribe("VIEW.CLEAR_CLICKED",()=>this.handleClearClicked()),this.dispatcher.subscribe("FileUploader:UploadStatusUpdate",e=>this.handleUploadStatusUpdate(e)),this.dispatcher.subscribe("VIEW.IMAGE_DELETED",e=>this.handleImageDeleted(e)),this.dispatcher.subscribe("VIEW.IMAGES_DELETED",e=>this.handleImagesDeleted(e.ids)),this.dispatcher.subscribe("VIEW.SET_MAIN_IMAGE",e=>this.handleSetMainImage(e)),this.dispatcher.subscribe("VIEW.SORT_CHANGED",e=>this.handleServerSortChanged(e)),this.dispatcher.subscribe("VIEW.ENTER_SELECTION",()=>this.transition(()=>this.model.enterSelection())),this.dispatcher.subscribe("VIEW.ENTER_REORDER",()=>this.transition(()=>this.model.enterReorder())),this.dispatcher.subscribe("VIEW.EXIT_MODE",()=>this.transition(()=>this.model.exitMode())),this.dispatcher.subscribe("VIEW.SELECT_ALL",()=>this.handleSelectAll()),this.dispatcher.subscribe("VIEW.TILE_TOGGLE_SELECT",e=>this.transition(()=>this.model.toggleSelected(e.id))),this.dispatcher.subscribe("VIEW.TILE_LONGPRESS",e=>this.transition(()=>{this.model.enterSelection(),this.model.toggleSelected(e.id)})),this.dispatcher.subscribe("VIEW.TILE_ACTIVATED",e=>this.transition(()=>this.model.setInspector(e.id))),this.dispatcher.subscribe("VIEW.CLOSE_INSPECTOR",()=>this.transition(()=>this.model.setInspector(null)))}transition(e){e(),this.view.render(this.model)}handleSelectAll(){let e=this.model.selectedIds.size===this.model.serverImages.length&&this.model.serverImages.length>0;this.transition(()=>e?this.model.clearSelection():this.model.selectAll())}async handleFilesAdded(e){let t=await this.model.addUploadImages(e);t.errors.length===1?this.view.notify({type:"error",title:"\u0424\u0430\u0439\u043B \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D",message:t.errors[0].message}):t.errors.length>1&&this.view.notify({type:"error",title:"\u0427\u0430\u0441\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u0432 \u043D\u0435 \u0434\u043E\u0431\u0430\u0432\u043B\u0435\u043D\u0430",message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0444\u0430\u0439\u043B\u043E\u0432: ${t.errors.length}`,details:t.errors.map(i=>`${i.fileName}: ${i.message}`)}),this.view.render(this.model)}handleImageDeleted(e){e.type==="upload"?(this.model.removeUploadImage(e.id),this.view.render(this.model)):this.handleImagesDeleted([e.id])}async handleImagesDeleted(e){if(e.length===0)return;let t=new Set(e),i=this.model.serverImages.some(p=>p.isMain&&t.has(p.id)),n=e.length;this.view.preloaderAction("start","delete","determinate"),this.view.busyProgress(0,`0 \u0438\u0437 ${n}`);let o=[],a=[],s=0;for(let p of e){try{await this.service.deleteImage(p),o.push(p)}catch(u){let g=u instanceof Error?u.message:String(u);console.error(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 ${p}:`,u),a.push({id:p,error:g})}s++,this.view.busyProgress(s/n*100,`${s} \u0438\u0437 ${n}`)}let l=new Set(o),d=this.model.serverImages.filter(p=>!l.has(p.id));i&&d.length>0&&!d.some(p=>p.isMain)&&(d=d.map((p,u)=>({...p,isMain:u===0}))),this.model.serverImages=d,this.model.exitMode(),this.view.render(this.model),this.view.preloaderAction("stop"),a.length>0&&this.view.notify({type:"error",title:"\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C",message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C ${a.length} \u0438\u0437 ${e.length} \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439`,details:a.map(p=>`\u0418\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 #${p.id}: ${p.error}`)})}async handleServerSortChanged(e){this.view.topBarAction("indeterminate");try{await this.service.setNewSort(e);let t=new Map(e.map(i=>[i.id,i.sort]));this.model.serverImages=this.model.serverImages.map(i=>({...i,sort:t.get(i.id)??i.sort})).sort((i,n)=>i.sort-n.sort),this.view.render(this.model)}catch(t){let i=t instanceof Error?t.message:String(t);this.view.notify({type:"error",title:"\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0440\u044F\u0434\u043E\u043A",message:i}),this.view.render(this.model),this.view.topBarAction("complete")}}async handleUploadClicked(){if(this.model.uploadImages.length===0){this.view.notify({type:"warning",message:"\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438"});return}this.model.isUploading=!0,this.view.render(this.model);try{let e=await this.fileUploader.uploadAll();this.model.serverImages=await this.service.getImages(),this.model.clearUploadImages(),this.model.isUploading=!1,this.view.render(this.model),e.failed.length===0?this.view.notify({type:"success",message:"\u0412\u0441\u0435 \u0444\u0430\u0439\u043B\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B"}):e.succeeded>0?this.view.notify({type:"warning",title:"\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B \u043D\u0435 \u0432\u0441\u0435 \u0444\u0430\u0439\u043B\u044B",message:`\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E ${e.succeeded} \u0438\u0437 ${e.succeeded+e.failed.length} \u0444\u0430\u0439\u043B\u043E\u0432. \u041E\u0441\u0442\u0430\u043B\u044C\u043D\u044B\u0435 \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0438\u0441\u044C:`,details:e.failed.map(t=>`${t.fileName}: ${t.error}`)}):this.view.notify({type:"error",title:"\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B\u044B",message:`\u041D\u0438 \u043E\u0434\u0438\u043D \u0438\u0437 \u0444\u0430\u0439\u043B\u043E\u0432 (${e.failed.length}) \u043D\u0435 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u043B\u0441\u044F:`,details:e.failed.map(t=>`${t.fileName}: ${t.error}`)})}catch(e){this.model.isUploading=!1,this.view.render(this.model);let t=e instanceof Error?e.message:String(e);this.view.notify({type:"error",title:"\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438",message:t})}}handleClearClicked(){this.model.clearUploadImages(),this.view.render(this.model)}async handleSetMainImage(e){this.view.topBarAction("indeterminate");try{await this.service.setMainImage(e.id),this.model.serverImages=this.model.serverImages.map(t=>({...t,isMain:t.id===e.id})),this.view.render(this.model)}catch(t){let i=t instanceof Error?t.message:String(t);this.view.notify({type:"error",title:"\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043D\u0430\u0437\u043D\u0430\u0447\u0438\u0442\u044C \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435",message:i}),this.view.topBarAction("complete")}}handleUploadStatusUpdate(e){this.model.updateUploadStatus(e),this.view.render(this.model)}};var Ae=class{constructor(e=1920,t=1080){this.maxWidth=e;this.maxHeight=t;this.isUploading=!1;this.overallProgress=0;this._filesToUploadList=null;this.nextUploadId=0;this._serverImages=[];this._uiMode="normal";this._selectedIds=new Set;this._inspectorImageId=null;this._uploadImages=[]}get serverImages(){return this._serverImages}set serverImages(e){this._serverImages=e,this.pruneUiRefs()}get uiMode(){return this._uiMode}get selectedIds(){return this._selectedIds}get inspectorImageId(){return this._inspectorImageId}get inspectorImage(){return this._inspectorImageId===null?null:this._serverImages.find(e=>e.id===this._inspectorImageId)??null}enterSelection(){this._uiMode="selection",this._inspectorImageId=null}enterReorder(){this._uiMode="reorder",this._selectedIds.clear(),this._inspectorImageId=null}exitMode(){this._uiMode="normal",this._selectedIds.clear()}isSelected(e){return this._selectedIds.has(e)}toggleSelected(e){return this._selectedIds.has(e)?(this._selectedIds.delete(e),!1):(this._selectedIds.add(e),!0)}selectAll(){this._selectedIds=new Set(this._serverImages.map(e=>e.id))}clearSelection(){this._selectedIds.clear()}setInspector(e){this._inspectorImageId=e}pruneUiRefs(){let e=new Set(this._serverImages.map(t=>t.id));for(let t of this._selectedIds)e.has(t)||this._selectedIds.delete(t);this._inspectorImageId!==null&&!e.has(this._inspectorImageId)&&(this._inspectorImageId=null)}get uploadImages(){return this._uploadImages}get uploadTotalCount(){return this._uploadImages.length}get uploadDoneCount(){return this._uploadImages.filter(e=>e.status==="completed"||e.status==="failed").length}async getImageResolution(e){return new Promise((t,i)=>{let n=new Image;n.src=URL.createObjectURL(e),n.onload=()=>{URL.revokeObjectURL(n.src),t({width:n.width,height:n.height})},n.onerror=()=>{URL.revokeObjectURL(n.src),i(new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F ${e.name}`))}})}async addUploadImages(e){let t=[],i=[];for(let n=0;n<e.length;n++){let o=e[n];try{try{let{width:a,height:s}=await this.getImageResolution(o);if(a>this.maxWidth||s>this.maxHeight){i.push({fileName:o.name,message:`\u0424\u0430\u0439\u043B ${o.name} \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 ${this.maxWidth}x${this.maxHeight} \u043F\u0438\u043A\u0441\u0435\u043B\u0435\u0439 (\u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435: ${a}x${s})`});continue}}catch{}t.push(o),this._uploadImages.push({kind:"upload",id:this.nextUploadId++,file:e[n],status:"pending",progress:0})}catch(a){let s=a instanceof Error?a.message:String(a);i.push({fileName:o.name,message:`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0444\u0430\u0439\u043B\u0430 ${o.name}: ${s}`})}}return this.setFilesToUpload(t),{validFiles:t,errors:i}}removeUploadImage(e){this._uploadImages=this._uploadImages.filter(i=>i.id!==e);let t=this._uploadImages.map(i=>i.file);this.setFilesToUpload(t)}getUploadEntries(){return this._uploadImages.filter(e=>e.status==="pending"||e.status==="uploading").map(e=>({uploadId:e.id,file:e.file}))}getFilesToUpload(){return this._filesToUploadList}clearUploadImages(){this._uploadImages=[],this.setFilesToUpload([])}updateUploadStatus(e){e.forEach(n=>{let o=this._uploadImages.find(a=>a.id===n.uploadId);o&&(o.status=n.status,o.progress=n.progress,o.error=n.error)});let t=this._uploadImages.length,i=this._uploadImages.filter(n=>n.status==="completed"||n.status==="failed").length;this.overallProgress=t>0?i/t*100:0}reorderUploadImages(e){this._uploadImages=e.map(t=>this._uploadImages.find(i=>i.id===t))}setFilesToUpload(e){let t=new DataTransfer;e.forEach(i=>t.items.add(i)),this._filesToUploadList=t.files}};var Ne=class{constructor(e,t,i,n){this.headers=e;this.endpoints=t;this.ownerId=i;this.formNames=n}async getImages(){try{let e=new FormData;e.append(`${this.formNames.getImagesForm}[id]`,this.ownerId);let t=await fetch(this.endpoints.getImages,{method:"POST",headers:this.headers,body:e}),i=await this.handleResponse(t);if(typeof i!="object"||i===null)throw console.error("\u0414\u0430\u043D\u043D\u044B\u0435 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C:",i),new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430");let n=Object.keys(i).filter(o=>!isNaN(Number(o))).map(o=>i[o]);return n.length===0?(console.warn("\u0421\u0435\u0440\u0432\u0435\u0440 \u0432\u0435\u0440\u043D\u0443\u043B \u0443\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442, \u043D\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442:",i),[]):n.sort((o,a)=>o.sort-a.sort)}catch(e){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 getImages:",e),e}}async deleteImage(e){try{let t=new FormData;t.append(`${this.formNames.deleteImageForm}[id]`,this.ownerId),t.append(`${this.formNames.deleteImageForm}[imageId]`,String(e));let i=await fetch(this.endpoints.deleteImage,{method:"POST",headers:this.headers,body:t});await this.handleResponse(i)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 deleteImage:",t),t}}async setMainImage(e){try{let t=new FormData;t.append(`${this.formNames.setMainImageForm}[id]`,this.ownerId),t.append(`${this.formNames.setMainImageForm}[imageId]`,String(e));let i=await fetch(this.endpoints.setMainImage,{method:"POST",headers:this.headers,body:t});await this.handleResponse(i)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 setMainImage:",t),t}}async setNewSort(e){try{let t=new FormData;t.append(`${this.formNames.setNewSortForm}[id]`,this.ownerId),t.append(`${this.formNames.setNewSortForm}[sortOrder]`,JSON.stringify(e));let i=await fetch(this.endpoints.setNewSort,{method:"POST",headers:this.headers,body:t});await this.handleResponse(i)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 setNewSort:",t),t}}async handleResponse(e){if(!e.ok)throw new Error(`HTTP \u043E\u0448\u0438\u0431\u043A\u0430 ${e.status}: ${e.statusText}`);let t=await e.json();if(t.status==="error"){let i=t.data,n=`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430: ${t.message||i.message||"\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}`;throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430:",{message:i.message,file:i.file,line:i.line,code:i.code}),new Error(n)}if(t.status!=="success")throw console.error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043E\u0442\u0432\u0435\u0442\u0430:",t.status),new Error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430");return t.data}};var ce=class extends HTMLElement{constructor(e){super(),this.dispatcher=e,this.attachShadow({mode:"open"}),this.fileInput=document.createElement("input"),this.fileInput.type="file",this.fileInput.multiple=!0,this.fileInput.accept="image/*",this.fileInput.style.display="none",this.fileInput.addEventListener("change",this.handleFileSelect.bind(this));let t=document.createElement("style");t.textContent=`
            :host {
                display: block;
                width: 100%;
                border: 2px dashed #d1d5db;
                border-radius: 12px;
                background: #fafafa;
                text-align: center;
                padding: 28px 16px;
                box-sizing: border-box;
                cursor: pointer;
                transition: border-color 0.2s ease, background 0.2s ease, transform 0.15s ease;
                user-select: none;
            }
            :host(:hover) {
                border-color: #4f7df3;
                background: #f0f5ff;
            }
            :host([dragover]) {
                border-color: #3b82f6;
                background: #dbeafe;
                transform: scale(1.008);
            }
            .drop-icon {
                color: #9ca3af;
                margin-bottom: 10px;
                transition: color 0.2s ease;
                display: block;
            }
            :host(:hover) .drop-icon,
            :host([dragover]) .drop-icon {
                color: #4f7df3;
            }
            .drop-title {
                font-size: 0.95em;
                font-weight: 600;
                color: #374151;
                margin: 0 0 4px;
            }
            .drop-hint {
                font-size: 0.78em;
                color: #9ca3af;
                margin: 0;
            }
        `;let i=document.createElement("span");i.className="drop-icon",i.innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6.502 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"/>
            <path d="M14 14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zM4 1a1 1 0 0 0-1 1v10l2.224-2.224a.5.5 0 0 1 .61-.075L8 11l2.157-3.02a.5.5 0 0 1 .76-.063L13 10V4.5h-2A1.5 1.5 0 0 1 9.5 3V1z"/>
        </svg>`;let n=document.createElement("p");n.className="drop-title";let o=document.createElement("p");o.className="drop-hint",window.FileReader?(n.textContent="\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0441\u044E\u0434\u0430",o.textContent="\u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0444\u0430\u0439\u043B\u043E\u0432"):(n.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u0430\u0439\u043B\u043E\u0432 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C",o.textContent="\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0434\u043E \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438"),this.shadowRoot?.appendChild(t),this.shadowRoot?.appendChild(i),this.shadowRoot?.appendChild(n),this.shadowRoot?.appendChild(o),this.shadowRoot?.appendChild(this.fileInput),this.addEventListener("dragenter",this.handleDragEnter.bind(this)),this.addEventListener("dragleave",this.handleDragLeave.bind(this)),this.addEventListener("dragover",this.handleDragOver.bind(this)),this.addEventListener("drop",this.handleDrop.bind(this)),this.addEventListener("click",this.handleClick.bind(this))}handleDragEnter(e){e.preventDefault(),e.stopPropagation(),this.setAttribute("dragover","")}handleDragLeave(e){e.preventDefault(),e.stopPropagation(),this.removeAttribute("dragover")}handleDragOver(e){e.preventDefault(),e.stopPropagation(),e.dataTransfer&&(e.dataTransfer.dropEffect="copy")}handleDrop(e){e.preventDefault(),e.stopPropagation(),this.removeAttribute("dragover"),e.dataTransfer?.files&&this.dispatcher.publish("VIEW.FILES_DROPPED",e.dataTransfer.files)}handleClick(){this.fileInput.click()}handleFileSelect(e){this.fileInput.files&&this.dispatcher.publish("VIEW.FILES_SELECTED",this.fileInput.files)}};customElements.define("dropzone-wc",ce);var Oe=class extends HTMLElement{constructor(t){super();this.dispatcher=t;this.attachShadow({mode:"open"}),this.render(),this.uploadBtn=this.shadowRoot.querySelector("#gallery-upload-btn"),this.clearBtn=this.shadowRoot.querySelector("#gallery-clear-btn"),this.setupEventListeners()}render(){this.shadowRoot.innerHTML=`
            <style>
                .controls-container {
                    display: flex;
                    gap: 8px;
                    padding: 10px 0 2px;
                }
                .btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 7px 14px;
                    font-size: 13px;
                    font-weight: 500;
                    border: none;
                    border-radius: 7px;
                    cursor: pointer;
                    transition: background 0.15s ease, transform 0.1s ease, box-shadow 0.15s ease;
                    line-height: 1;
                    letter-spacing: 0.01em;
                }
                .btn:active {
                    transform: scale(0.97);
                }
                .btn-upload {
                    background: #4f7df3;
                    color: #fff;
                    box-shadow: 0 1px 3px rgba(79,125,243,0.35);
                }
                .btn-upload:hover {
                    background: #3b6de0;
                    box-shadow: 0 3px 8px rgba(79,125,243,0.45);
                }
                .btn-clear {
                    background: #f3f4f6;
                    color: #6b7280;
                    border: 1px solid #e5e7eb;
                    padding: 6px 14px;
                }
                .btn-clear:hover {
                    background: #e9eaec;
                    color: #4b5563;
                }
                svg {
                    flex-shrink: 0;
                }
            </style>
            <div class="controls-container">
                <button id="gallery-upload-btn" type="button" class="btn btn-upload">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>
                    </svg>
                    \u0417\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C
                </button>
                <button id="gallery-clear-btn" type="button" class="btn btn-clear">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>
                    </svg>
                    \u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C
                </button>
            </div>
        `}setupEventListeners(){this.uploadBtn.addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.UPLOAD_CLICKED")}),this.clearBtn.addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.CLEAR_CLICKED")})}};customElements.define("controls-component",Oe);var J=(r,e)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${r}" height="${r}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${e}</svg>`,_={star:(r=16)=>J(r,'<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>'),trash:(r=16)=>J(r,'<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>'),upload:(r=16)=>J(r,'<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>'),clear:(r=16)=>J(r,'<path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>'),check:(r=16)=>J(r,'<path d="M13.485 1.929a.75.75 0 0 1 .086 1.056l-7 8.5a.75.75 0 0 1-1.09.05l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.92 2.92 6.47-7.86a.75.75 0 0 1 1.054-.086z"/>'),close:(r=16)=>J(r,'<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>'),select:(r=16)=>J(r,'<path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 13.5 1zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5z"/><path d="M10.97 5.47a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 9.01a.75.75 0 1 1 1.06-1.06l1.094 1.093 3.473-3.548z"/>'),reorder:(r=16)=>J(r,'<path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>')};var pe=class extends HTMLElement{constructor(t){super();this.dispatcher=t;this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=this.template(),this.bind()}update(t,i){let n=i>0;this.toggle(".js-mode-buttons",n&&t==="normal"),this.toggle(".js-reorder-done",t==="reorder"),this.style.display=t==="normal"&&n||t==="reorder"?"block":"none"}bind(){this.on(".js-select","VIEW.ENTER_SELECTION"),this.on(".js-reorder","VIEW.ENTER_REORDER"),this.on(".js-reorder-done","VIEW.EXIT_MODE")}on(t,i){this.shadowRoot.querySelector(t).addEventListener("click",n=>{n.preventDefault(),this.dispatcher.publish(i)})}toggle(t,i){this.shadowRoot.querySelector(t).style.display=i?"flex":"none"}template(){return`
            <style>
                :host { display: block; }
                .bar { display: flex; gap: 8px; align-items: center; padding: 2px 0 10px; }
                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 7px 13px;
                    font: 500 13px/1 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: var(--gu-text, #374151);
                    background: var(--gu-surface, #f3f4f6);
                    border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background .15s ease, color .15s ease, transform .1s ease;
                }
                .btn:hover { background: #e9eaec; color: var(--gu-text-strong, #1f2937); }
                .btn:active { transform: scale(.97); }
                .btn--primary {
                    color: #fff;
                    background: var(--gu-accent, #4f7df3);
                    border-color: transparent;
                    box-shadow: 0 1px 3px rgba(79,125,243,.35);
                }
                .btn--primary:hover { background: var(--gu-accent-hover, #3b6de0); color: #fff; }
                svg { flex-shrink: 0; }
            </style>
            <div class="bar">
                <span class="js-mode-buttons" style="display:flex; gap:8px;">
                    <button type="button" class="btn js-select">${_.select(15)} \u0412\u044B\u0431\u0440\u0430\u0442\u044C</button>
                    <button type="button" class="btn js-reorder">${_.reorder(15)} \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0440\u044F\u0434\u043E\u043A</button>
                </span>
                <button type="button" class="btn btn--primary js-reorder-done" style="display:none;">
                    ${_.check(15)} \u0413\u043E\u0442\u043E\u0432\u043E
                </button>
            </div>
        `}};customElements.define("grid-toolbar",pe);function Lt(r,e){var t=Object.keys(r);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(r);e&&(i=i.filter(function(n){return Object.getOwnPropertyDescriptor(r,n).enumerable})),t.push.apply(t,i)}return t}function q(r){for(var e=1;e<arguments.length;e++){var t=arguments[e]!=null?arguments[e]:{};e%2?Lt(Object(t),!0).forEach(function(i){ii(r,i,t[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(r,Object.getOwnPropertyDescriptors(t)):Lt(Object(t)).forEach(function(i){Object.defineProperty(r,i,Object.getOwnPropertyDescriptor(t,i))})}return r}function et(r){"@babel/helpers - typeof";return typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?et=function(e){return typeof e}:et=function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},et(r)}function ii(r,e,t){return e in r?Object.defineProperty(r,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):r[e]=t,r}function Y(){return Y=Object.assign||function(r){for(var e=1;e<arguments.length;e++){var t=arguments[e];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(r[i]=t[i])}return r},Y.apply(this,arguments)}function ri(r,e){if(r==null)return{};var t={},i=Object.keys(r),n,o;for(o=0;o<i.length;o++)n=i[o],!(e.indexOf(n)>=0)&&(t[n]=r[n]);return t}function ni(r,e){if(r==null)return{};var t=ri(r,e),i,n;if(Object.getOwnPropertySymbols){var o=Object.getOwnPropertySymbols(r);for(n=0;n<o.length;n++)i=o[n],!(e.indexOf(i)>=0)&&Object.prototype.propertyIsEnumerable.call(r,i)&&(t[i]=r[i])}return t}var oi="1.15.6";function X(r){if(typeof window<"u"&&window.navigator)return!!navigator.userAgent.match(r)}var K=X(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),ze=X(/Edge/i),kt=X(/firefox/i),He=X(/safari/i)&&!X(/chrome/i)&&!X(/android/i),Tt=X(/iP(ad|od|hone)/i),Ut=X(/chrome/i)&&X(/android/i),Bt={capture:!1,passive:!1};function b(r,e,t){r.addEventListener(e,t,!K&&Bt)}function v(r,e,t){r.removeEventListener(e,t,!K&&Bt)}function ot(r,e){if(e){if(e[0]===">"&&(e=e.substring(1)),r)try{if(r.matches)return r.matches(e);if(r.msMatchesSelector)return r.msMatchesSelector(e);if(r.webkitMatchesSelector)return r.webkitMatchesSelector(e)}catch{return!1}return!1}}function Vt(r){return r.host&&r!==document&&r.host.nodeType?r.host:r.parentNode}function W(r,e,t,i){if(r){t=t||document;do{if(e!=null&&(e[0]===">"?r.parentNode===t&&ot(r,e):ot(r,e))||i&&r===t)return r;if(r===t)break}while(r=Vt(r))}return null}var At=/\s+/g;function P(r,e,t){if(r&&e)if(r.classList)r.classList[t?"add":"remove"](e);else{var i=(" "+r.className+" ").replace(At," ").replace(" "+e+" "," ");r.className=(i+(t?" "+e:"")).replace(At," ")}}function h(r,e,t){var i=r&&r.style;if(i){if(t===void 0)return document.defaultView&&document.defaultView.getComputedStyle?t=document.defaultView.getComputedStyle(r,""):r.currentStyle&&(t=r.currentStyle),e===void 0?t:t[e];!(e in i)&&e.indexOf("webkit")===-1&&(e="-webkit-"+e),i[e]=t+(typeof t=="string"?"":"px")}}function ge(r,e){var t="";if(typeof r=="string")t=r;else do{var i=h(r,"transform");i&&i!=="none"&&(t=i+" "+t)}while(!e&&(r=r.parentNode));var n=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return n&&new n(t)}function Wt(r,e,t){if(r){var i=r.getElementsByTagName(e),n=0,o=i.length;if(t)for(;n<o;n++)t(i[n],n);return i}return[]}function $(){var r=document.scrollingElement;return r||document.documentElement}function D(r,e,t,i,n){if(!(!r.getBoundingClientRect&&r!==window)){var o,a,s,l,d,p,u;if(r!==window&&r.parentNode&&r!==$()?(o=r.getBoundingClientRect(),a=o.top,s=o.left,l=o.bottom,d=o.right,p=o.height,u=o.width):(a=0,s=0,l=window.innerHeight,d=window.innerWidth,p=window.innerHeight,u=window.innerWidth),(e||t)&&r!==window&&(n=n||r.parentNode,!K))do if(n&&n.getBoundingClientRect&&(h(n,"transform")!=="none"||t&&h(n,"position")!=="static")){var g=n.getBoundingClientRect();a-=g.top+parseInt(h(n,"border-top-width")),s-=g.left+parseInt(h(n,"border-left-width")),l=a+o.height,d=s+o.width;break}while(n=n.parentNode);if(i&&r!==window){var w=ge(n||r),y=w&&w.a,E=w&&w.d;w&&(a/=E,s/=y,u/=y,p/=E,l=a+p,d=s+u)}return{top:a,left:s,bottom:l,right:d,width:u,height:p}}}function Nt(r,e,t){for(var i=ie(r,!0),n=D(r)[e];i;){var o=D(i)[t],a=void 0;if(t==="top"||t==="left"?a=n>=o:a=n<=o,!a)return i;if(i===$())break;i=ie(i,!1)}return!1}function ve(r,e,t,i){for(var n=0,o=0,a=r.children;o<a.length;){if(a[o].style.display!=="none"&&a[o]!==f.ghost&&(i||a[o]!==f.dragged)&&W(a[o],t.draggable,r,!1)){if(n===e)return a[o];n++}o++}return null}function Dt(r,e){for(var t=r.lastElementChild;t&&(t===f.ghost||h(t,"display")==="none"||e&&!ot(t,e));)t=t.previousElementSibling;return t||null}function H(r,e){var t=0;if(!r||!r.parentNode)return-1;for(;r=r.previousElementSibling;)r.nodeName.toUpperCase()!=="TEMPLATE"&&r!==f.clone&&(!e||ot(r,e))&&t++;return t}function Ot(r){var e=0,t=0,i=$();if(r)do{var n=ge(r),o=n.a,a=n.d;e+=r.scrollLeft*o,t+=r.scrollTop*a}while(r!==i&&(r=r.parentNode));return[e,t]}function ai(r,e){for(var t in r)if(r.hasOwnProperty(t)){for(var i in e)if(e.hasOwnProperty(i)&&e[i]===r[t][i])return Number(t)}return-1}function ie(r,e){if(!r||!r.getBoundingClientRect)return $();var t=r,i=!1;do if(t.clientWidth<t.scrollWidth||t.clientHeight<t.scrollHeight){var n=h(t);if(t.clientWidth<t.scrollWidth&&(n.overflowX=="auto"||n.overflowX=="scroll")||t.clientHeight<t.scrollHeight&&(n.overflowY=="auto"||n.overflowY=="scroll")){if(!t.getBoundingClientRect||t===document.body)return $();if(i||e)return t;i=!0}}while(t=t.parentNode);return $()}function si(r,e){if(r&&e)for(var t in e)e.hasOwnProperty(t)&&(r[t]=e[t]);return r}function ut(r,e){return Math.round(r.top)===Math.round(e.top)&&Math.round(r.left)===Math.round(e.left)&&Math.round(r.height)===Math.round(e.height)&&Math.round(r.width)===Math.round(e.width)}var Ue;function zt(r,e){return function(){if(!Ue){var t=arguments,i=this;t.length===1?r.call(i,t[0]):r.apply(i,t),Ue=setTimeout(function(){Ue=void 0},e)}}}function li(){clearTimeout(Ue),Ue=void 0}function $t(r,e,t){r.scrollLeft+=e,r.scrollTop+=t}function qt(r){var e=window.Polymer,t=window.jQuery||window.Zepto;return e&&e.dom?e.dom(r).cloneNode(!0):t?t(r).clone(!0)[0]:r.cloneNode(!0)}function jt(r,e,t){var i={};return Array.from(r.children).forEach(function(n){var o,a,s,l;if(!(!W(n,e.draggable,r,!1)||n.animated||n===t)){var d=D(n);i.left=Math.min((o=i.left)!==null&&o!==void 0?o:1/0,d.left),i.top=Math.min((a=i.top)!==null&&a!==void 0?a:1/0,d.top),i.right=Math.max((s=i.right)!==null&&s!==void 0?s:-1/0,d.right),i.bottom=Math.max((l=i.bottom)!==null&&l!==void 0?l:-1/0,d.bottom)}}),i.width=i.right-i.left,i.height=i.bottom-i.top,i.x=i.left,i.y=i.top,i}var N="Sortable"+new Date().getTime();function di(){var r=[],e;return{captureAnimationState:function(){if(r=[],!!this.options.animation){var i=[].slice.call(this.el.children);i.forEach(function(n){if(!(h(n,"display")==="none"||n===f.ghost)){r.push({target:n,rect:D(n)});var o=q({},r[r.length-1].rect);if(n.thisAnimationDuration){var a=ge(n,!0);a&&(o.top-=a.f,o.left-=a.e)}n.fromRect=o}})}},addAnimationState:function(i){r.push(i)},removeAnimationState:function(i){r.splice(ai(r,{target:i}),1)},animateAll:function(i){var n=this;if(!this.options.animation){clearTimeout(e),typeof i=="function"&&i();return}var o=!1,a=0;r.forEach(function(s){var l=0,d=s.target,p=d.fromRect,u=D(d),g=d.prevFromRect,w=d.prevToRect,y=s.rect,E=ge(d,!0);E&&(u.top-=E.f,u.left-=E.e),d.toRect=u,d.thisAnimationDuration&&ut(g,u)&&!ut(p,u)&&(y.top-u.top)/(y.left-u.left)===(p.top-u.top)/(p.left-u.left)&&(l=pi(y,g,w,n.options)),ut(u,p)||(d.prevFromRect=p,d.prevToRect=u,l||(l=n.options.animation),n.animate(d,y,u,l)),l&&(o=!0,a=Math.max(a,l),clearTimeout(d.animationResetTimer),d.animationResetTimer=setTimeout(function(){d.animationTime=0,d.prevFromRect=null,d.fromRect=null,d.prevToRect=null,d.thisAnimationDuration=null},l),d.thisAnimationDuration=l)}),clearTimeout(e),o?e=setTimeout(function(){typeof i=="function"&&i()},a):typeof i=="function"&&i(),r=[]},animate:function(i,n,o,a){if(a){h(i,"transition",""),h(i,"transform","");var s=ge(this.el),l=s&&s.a,d=s&&s.d,p=(n.left-o.left)/(l||1),u=(n.top-o.top)/(d||1);i.animatingX=!!p,i.animatingY=!!u,h(i,"transform","translate3d("+p+"px,"+u+"px,0)"),this.forRepaintDummy=ci(i),h(i,"transition","transform "+a+"ms"+(this.options.easing?" "+this.options.easing:"")),h(i,"transform","translate3d(0,0,0)"),typeof i.animated=="number"&&clearTimeout(i.animated),i.animated=setTimeout(function(){h(i,"transition",""),h(i,"transform",""),i.animated=!1,i.animatingX=!1,i.animatingY=!1},a)}}}}function ci(r){return r.offsetWidth}function pi(r,e,t,i){return Math.sqrt(Math.pow(e.top-r.top,2)+Math.pow(e.left-r.left,2))/Math.sqrt(Math.pow(e.top-t.top,2)+Math.pow(e.left-t.left,2))*i.animation}var ue=[],ht={initializeByDefault:!0},$e={mount:function(e){for(var t in ht)ht.hasOwnProperty(t)&&!(t in e)&&(e[t]=ht[t]);ue.forEach(function(i){if(i.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")}),ue.push(e)},pluginEvent:function(e,t,i){var n=this;this.eventCanceled=!1,i.cancel=function(){n.eventCanceled=!0};var o=e+"Global";ue.forEach(function(a){t[a.pluginName]&&(t[a.pluginName][o]&&t[a.pluginName][o](q({sortable:t},i)),t.options[a.pluginName]&&t[a.pluginName][e]&&t[a.pluginName][e](q({sortable:t},i)))})},initializePlugins:function(e,t,i,n){ue.forEach(function(s){var l=s.pluginName;if(!(!e.options[l]&&!s.initializeByDefault)){var d=new s(e,t,e.options);d.sortable=e,d.options=e.options,e[l]=d,Y(i,d.defaults)}});for(var o in e.options)if(e.options.hasOwnProperty(o)){var a=this.modifyOption(e,o,e.options[o]);typeof a<"u"&&(e.options[o]=a)}},getEventProperties:function(e,t){var i={};return ue.forEach(function(n){typeof n.eventProperties=="function"&&Y(i,n.eventProperties.call(t[n.pluginName],e))}),i},modifyOption:function(e,t,i){var n;return ue.forEach(function(o){e[o.pluginName]&&o.optionListeners&&typeof o.optionListeners[t]=="function"&&(n=o.optionListeners[t].call(e[o.pluginName],i))}),n}};function ui(r){var e=r.sortable,t=r.rootEl,i=r.name,n=r.targetEl,o=r.cloneEl,a=r.toEl,s=r.fromEl,l=r.oldIndex,d=r.newIndex,p=r.oldDraggableIndex,u=r.newDraggableIndex,g=r.originalEvent,w=r.putSortable,y=r.extraEventProperties;if(e=e||t&&t[N],!!e){var E,U=e.options,j="on"+i.charAt(0).toUpperCase()+i.substr(1);window.CustomEvent&&!K&&!ze?E=new CustomEvent(i,{bubbles:!0,cancelable:!0}):(E=document.createEvent("Event"),E.initEvent(i,!0,!0)),E.to=a||t,E.from=s||t,E.item=n||t,E.clone=o,E.oldIndex=l,E.newIndex=d,E.oldDraggableIndex=p,E.newDraggableIndex=u,E.originalEvent=g,E.pullMode=w?w.lastPutMode:void 0;var L=q(q({},y),$e.getEventProperties(i,e));for(var B in L)E[B]=L[B];t&&t.dispatchEvent(E),U[j]&&U[j].call(e,E)}}var hi=["evt"],A=function(e,t){var i=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},n=i.evt,o=ni(i,hi);$e.pluginEvent.bind(f)(e,t,q({dragEl:c,parentEl:I,ghostEl:m,rootEl:x,nextEl:le,lastDownEl:tt,cloneEl:S,cloneHidden:te,dragStarted:Re,putSortable:C,activeSortable:f.active,originalEvent:n,oldIndex:me,oldDraggableIndex:Be,newIndex:F,newDraggableIndex:ee,hideGhostForTarget:Kt,unhideGhostForTarget:Qt,cloneNowHidden:function(){te=!0},cloneNowShown:function(){te=!1},dispatchSortableEvent:function(s){k({sortable:t,name:s,originalEvent:n})}},o))};function k(r){ui(q({putSortable:C,cloneEl:S,targetEl:c,rootEl:x,oldIndex:me,oldDraggableIndex:Be,newIndex:F,newDraggableIndex:ee},r))}var c,I,m,x,le,tt,S,te,me,F,Be,ee,Ke,C,fe=!1,at=!1,st=[],ae,V,ft,mt,Rt,Pt,Re,he,Ve,We=!1,Qe=!1,it,M,gt=[],wt=!1,lt=[],ct=typeof document<"u",Ze=Tt,Ft=ze||K?"cssFloat":"float",fi=ct&&!Ut&&!Tt&&"draggable"in document.createElement("div"),Gt=function(){if(ct){if(K)return!1;var r=document.createElement("x");return r.style.cssText="pointer-events:auto",r.style.pointerEvents==="auto"}}(),Xt=function(e,t){var i=h(e),n=parseInt(i.width)-parseInt(i.paddingLeft)-parseInt(i.paddingRight)-parseInt(i.borderLeftWidth)-parseInt(i.borderRightWidth),o=ve(e,0,t),a=ve(e,1,t),s=o&&h(o),l=a&&h(a),d=s&&parseInt(s.marginLeft)+parseInt(s.marginRight)+D(o).width,p=l&&parseInt(l.marginLeft)+parseInt(l.marginRight)+D(a).width;if(i.display==="flex")return i.flexDirection==="column"||i.flexDirection==="column-reverse"?"vertical":"horizontal";if(i.display==="grid")return i.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(o&&s.float&&s.float!=="none"){var u=s.float==="left"?"left":"right";return a&&(l.clear==="both"||l.clear===u)?"vertical":"horizontal"}return o&&(s.display==="block"||s.display==="flex"||s.display==="table"||s.display==="grid"||d>=n&&i[Ft]==="none"||a&&i[Ft]==="none"&&d+p>n)?"vertical":"horizontal"},mi=function(e,t,i){var n=i?e.left:e.top,o=i?e.right:e.bottom,a=i?e.width:e.height,s=i?t.left:t.top,l=i?t.right:t.bottom,d=i?t.width:t.height;return n===s||o===l||n+a/2===s+d/2},gi=function(e,t){var i;return st.some(function(n){var o=n[N].options.emptyInsertThreshold;if(!(!o||Dt(n))){var a=D(n),s=e>=a.left-o&&e<=a.right+o,l=t>=a.top-o&&t<=a.bottom+o;if(s&&l)return i=n}}),i},Yt=function(e){function t(o,a){return function(s,l,d,p){var u=s.options.group.name&&l.options.group.name&&s.options.group.name===l.options.group.name;if(o==null&&(a||u))return!0;if(o==null||o===!1)return!1;if(a&&o==="clone")return o;if(typeof o=="function")return t(o(s,l,d,p),a)(s,l,d,p);var g=(a?s:l).options.group.name;return o===!0||typeof o=="string"&&o===g||o.join&&o.indexOf(g)>-1}}var i={},n=e.group;(!n||et(n)!="object")&&(n={name:n}),i.name=n.name,i.checkPull=t(n.pull,!0),i.checkPut=t(n.put),i.revertClone=n.revertClone,e.group=i},Kt=function(){!Gt&&m&&h(m,"display","none")},Qt=function(){!Gt&&m&&h(m,"display","")};ct&&!Ut&&document.addEventListener("click",function(r){if(at)return r.preventDefault(),r.stopPropagation&&r.stopPropagation(),r.stopImmediatePropagation&&r.stopImmediatePropagation(),at=!1,!1},!0);var se=function(e){if(c){e=e.touches?e.touches[0]:e;var t=gi(e.clientX,e.clientY);if(t){var i={};for(var n in e)e.hasOwnProperty(n)&&(i[n]=e[n]);i.target=i.rootEl=t,i.preventDefault=void 0,i.stopPropagation=void 0,t[N]._onDragOver(i)}}},vi=function(e){c&&c.parentNode[N]._isOutsideThisEl(e.target)};function f(r,e){if(!(r&&r.nodeType&&r.nodeType===1))throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(r));this.el=r,this.options=e=Y({},e),r[N]=this;var t={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(r.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return Xt(r,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(a,s){a.setData("Text",s.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:f.supportPointer!==!1&&"PointerEvent"in window&&(!He||Tt),emptyInsertThreshold:5};$e.initializePlugins(this,r,t);for(var i in t)!(i in e)&&(e[i]=t[i]);Yt(e);for(var n in this)n.charAt(0)==="_"&&typeof this[n]=="function"&&(this[n]=this[n].bind(this));this.nativeDraggable=e.forceFallback?!1:fi,this.nativeDraggable&&(this.options.touchStartThreshold=1),e.supportPointer?b(r,"pointerdown",this._onTapStart):(b(r,"mousedown",this._onTapStart),b(r,"touchstart",this._onTapStart)),this.nativeDraggable&&(b(r,"dragover",this),b(r,"dragenter",this)),st.push(this.el),e.store&&e.store.get&&this.sort(e.store.get(this)||[]),Y(this,di())}f.prototype={constructor:f,_isOutsideThisEl:function(e){!this.el.contains(e)&&e!==this.el&&(he=null)},_getDirection:function(e,t){return typeof this.options.direction=="function"?this.options.direction.call(this,e,t,c):this.options.direction},_onTapStart:function(e){if(e.cancelable){var t=this,i=this.el,n=this.options,o=n.preventOnFilter,a=e.type,s=e.touches&&e.touches[0]||e.pointerType&&e.pointerType==="touch"&&e,l=(s||e).target,d=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||l,p=n.filter;if(Ti(i),!c&&!(/mousedown|pointerdown/.test(a)&&e.button!==0||n.disabled)&&!d.isContentEditable&&!(!this.nativeDraggable&&He&&l&&l.tagName.toUpperCase()==="SELECT")&&(l=W(l,n.draggable,i,!1),!(l&&l.animated)&&tt!==l)){if(me=H(l),Be=H(l,n.draggable),typeof p=="function"){if(p.call(this,e,l,this)){k({sortable:t,rootEl:d,name:"filter",targetEl:l,toEl:i,fromEl:i}),A("filter",t,{evt:e}),o&&e.preventDefault();return}}else if(p&&(p=p.split(",").some(function(u){if(u=W(d,u.trim(),i,!1),u)return k({sortable:t,rootEl:u,name:"filter",targetEl:l,fromEl:i,toEl:i}),A("filter",t,{evt:e}),!0}),p)){o&&e.preventDefault();return}n.handle&&!W(d,n.handle,i,!1)||this._prepareDragStart(e,s,l)}}},_prepareDragStart:function(e,t,i){var n=this,o=n.el,a=n.options,s=o.ownerDocument,l;if(i&&!c&&i.parentNode===o){var d=D(i);if(x=o,c=i,I=c.parentNode,le=c.nextSibling,tt=i,Ke=a.group,f.dragged=c,ae={target:c,clientX:(t||e).clientX,clientY:(t||e).clientY},Rt=ae.clientX-d.left,Pt=ae.clientY-d.top,this._lastX=(t||e).clientX,this._lastY=(t||e).clientY,c.style["will-change"]="all",l=function(){if(A("delayEnded",n,{evt:e}),f.eventCanceled){n._onDrop();return}n._disableDelayedDragEvents(),!kt&&n.nativeDraggable&&(c.draggable=!0),n._triggerDragStart(e,t),k({sortable:n,name:"choose",originalEvent:e}),P(c,a.chosenClass,!0)},a.ignore.split(",").forEach(function(p){Wt(c,p.trim(),vt)}),b(s,"dragover",se),b(s,"mousemove",se),b(s,"touchmove",se),a.supportPointer?(b(s,"pointerup",n._onDrop),!this.nativeDraggable&&b(s,"pointercancel",n._onDrop)):(b(s,"mouseup",n._onDrop),b(s,"touchend",n._onDrop),b(s,"touchcancel",n._onDrop)),kt&&this.nativeDraggable&&(this.options.touchStartThreshold=4,c.draggable=!0),A("delayStart",this,{evt:e}),a.delay&&(!a.delayOnTouchOnly||t)&&(!this.nativeDraggable||!(ze||K))){if(f.eventCanceled){this._onDrop();return}a.supportPointer?(b(s,"pointerup",n._disableDelayedDrag),b(s,"pointercancel",n._disableDelayedDrag)):(b(s,"mouseup",n._disableDelayedDrag),b(s,"touchend",n._disableDelayedDrag),b(s,"touchcancel",n._disableDelayedDrag)),b(s,"mousemove",n._delayedDragTouchMoveHandler),b(s,"touchmove",n._delayedDragTouchMoveHandler),a.supportPointer&&b(s,"pointermove",n._delayedDragTouchMoveHandler),n._dragStartTimer=setTimeout(l,a.delay)}else l()}},_delayedDragTouchMoveHandler:function(e){var t=e.touches?e.touches[0]:e;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){c&&vt(c),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var e=this.el.ownerDocument;v(e,"mouseup",this._disableDelayedDrag),v(e,"touchend",this._disableDelayedDrag),v(e,"touchcancel",this._disableDelayedDrag),v(e,"pointerup",this._disableDelayedDrag),v(e,"pointercancel",this._disableDelayedDrag),v(e,"mousemove",this._delayedDragTouchMoveHandler),v(e,"touchmove",this._delayedDragTouchMoveHandler),v(e,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(e,t){t=t||e.pointerType=="touch"&&e,!this.nativeDraggable||t?this.options.supportPointer?b(document,"pointermove",this._onTouchMove):t?b(document,"touchmove",this._onTouchMove):b(document,"mousemove",this._onTouchMove):(b(c,"dragend",this),b(x,"dragstart",this._onDragStart));try{document.selection?rt(function(){document.selection.empty()}):window.getSelection().removeAllRanges()}catch{}},_dragStarted:function(e,t){if(fe=!1,x&&c){A("dragStarted",this,{evt:t}),this.nativeDraggable&&b(document,"dragover",vi);var i=this.options;!e&&P(c,i.dragClass,!1),P(c,i.ghostClass,!0),f.active=this,e&&this._appendGhost(),k({sortable:this,name:"start",originalEvent:t})}else this._nulling()},_emulateDragOver:function(){if(V){this._lastX=V.clientX,this._lastY=V.clientY,Kt();for(var e=document.elementFromPoint(V.clientX,V.clientY),t=e;e&&e.shadowRoot&&(e=e.shadowRoot.elementFromPoint(V.clientX,V.clientY),e!==t);)t=e;if(c.parentNode[N]._isOutsideThisEl(e),t)do{if(t[N]){var i=void 0;if(i=t[N]._onDragOver({clientX:V.clientX,clientY:V.clientY,target:e,rootEl:t}),i&&!this.options.dragoverBubble)break}e=t}while(t=Vt(t));Qt()}},_onTouchMove:function(e){if(ae){var t=this.options,i=t.fallbackTolerance,n=t.fallbackOffset,o=e.touches?e.touches[0]:e,a=m&&ge(m,!0),s=m&&a&&a.a,l=m&&a&&a.d,d=Ze&&M&&Ot(M),p=(o.clientX-ae.clientX+n.x)/(s||1)+(d?d[0]-gt[0]:0)/(s||1),u=(o.clientY-ae.clientY+n.y)/(l||1)+(d?d[1]-gt[1]:0)/(l||1);if(!f.active&&!fe){if(i&&Math.max(Math.abs(o.clientX-this._lastX),Math.abs(o.clientY-this._lastY))<i)return;this._onDragStart(e,!0)}if(m){a?(a.e+=p-(ft||0),a.f+=u-(mt||0)):a={a:1,b:0,c:0,d:1,e:p,f:u};var g="matrix(".concat(a.a,",").concat(a.b,",").concat(a.c,",").concat(a.d,",").concat(a.e,",").concat(a.f,")");h(m,"webkitTransform",g),h(m,"mozTransform",g),h(m,"msTransform",g),h(m,"transform",g),ft=p,mt=u,V=o}e.cancelable&&e.preventDefault()}},_appendGhost:function(){if(!m){var e=this.options.fallbackOnBody?document.body:x,t=D(c,!0,Ze,!0,e),i=this.options;if(Ze){for(M=e;h(M,"position")==="static"&&h(M,"transform")==="none"&&M!==document;)M=M.parentNode;M!==document.body&&M!==document.documentElement?(M===document&&(M=$()),t.top+=M.scrollTop,t.left+=M.scrollLeft):M=$(),gt=Ot(M)}m=c.cloneNode(!0),P(m,i.ghostClass,!1),P(m,i.fallbackClass,!0),P(m,i.dragClass,!0),h(m,"transition",""),h(m,"transform",""),h(m,"box-sizing","border-box"),h(m,"margin",0),h(m,"top",t.top),h(m,"left",t.left),h(m,"width",t.width),h(m,"height",t.height),h(m,"opacity","0.8"),h(m,"position",Ze?"absolute":"fixed"),h(m,"zIndex","100000"),h(m,"pointerEvents","none"),f.ghost=m,e.appendChild(m),h(m,"transform-origin",Rt/parseInt(m.style.width)*100+"% "+Pt/parseInt(m.style.height)*100+"%")}},_onDragStart:function(e,t){var i=this,n=e.dataTransfer,o=i.options;if(A("dragStart",this,{evt:e}),f.eventCanceled){this._onDrop();return}A("setupClone",this),f.eventCanceled||(S=qt(c),S.removeAttribute("id"),S.draggable=!1,S.style["will-change"]="",this._hideClone(),P(S,this.options.chosenClass,!1),f.clone=S),i.cloneId=rt(function(){A("clone",i),!f.eventCanceled&&(i.options.removeCloneOnHide||x.insertBefore(S,c),i._hideClone(),k({sortable:i,name:"clone"}))}),!t&&P(c,o.dragClass,!0),t?(at=!0,i._loopId=setInterval(i._emulateDragOver,50)):(v(document,"mouseup",i._onDrop),v(document,"touchend",i._onDrop),v(document,"touchcancel",i._onDrop),n&&(n.effectAllowed="move",o.setData&&o.setData.call(i,n,c)),b(document,"drop",i),h(c,"transform","translateZ(0)")),fe=!0,i._dragStartId=rt(i._dragStarted.bind(i,t,e)),b(document,"selectstart",i),Re=!0,window.getSelection().removeAllRanges(),He&&h(document.body,"user-select","none")},_onDragOver:function(e){var t=this.el,i=e.target,n,o,a,s=this.options,l=s.group,d=f.active,p=Ke===l,u=s.sort,g=C||d,w,y=this,E=!1;if(wt)return;function U(Ce,ei){A(Ce,y,q({evt:e,isOwner:p,axis:w?"vertical":"horizontal",revert:a,dragRect:n,targetRect:o,canSort:u,fromSortable:g,target:i,completed:L,onMove:function(Mt,ti){return Je(x,t,c,n,Mt,D(Mt),e,ti)},changed:B},ei))}function j(){U("dragOverAnimationCapture"),y.captureAnimationState(),y!==g&&g.captureAnimationState()}function L(Ce){return U("dragOverCompleted",{insertion:Ce}),Ce&&(p?d._hideClone():d._showClone(y),y!==g&&(P(c,C?C.options.ghostClass:d.options.ghostClass,!1),P(c,s.ghostClass,!0)),C!==y&&y!==f.active?C=y:y===f.active&&C&&(C=null),g===y&&(y._ignoreWhileAnimating=i),y.animateAll(function(){U("dragOverAnimationComplete"),y._ignoreWhileAnimating=null}),y!==g&&(g.animateAll(),g._ignoreWhileAnimating=null)),(i===c&&!c.animated||i===t&&!i.animated)&&(he=null),!s.dragoverBubble&&!e.rootEl&&i!==document&&(c.parentNode[N]._isOutsideThisEl(e.target),!Ce&&se(e)),!s.dragoverBubble&&e.stopPropagation&&e.stopPropagation(),E=!0}function B(){F=H(c),ee=H(c,s.draggable),k({sortable:y,name:"change",toEl:t,newIndex:F,newDraggableIndex:ee,originalEvent:e})}if(e.preventDefault!==void 0&&e.cancelable&&e.preventDefault(),i=W(i,s.draggable,t,!0),U("dragOver"),f.eventCanceled)return E;if(c.contains(e.target)||i.animated&&i.animatingX&&i.animatingY||y._ignoreWhileAnimating===i)return L(!1);if(at=!1,d&&!s.disabled&&(p?u||(a=I!==x):C===this||(this.lastPutMode=Ke.checkPull(this,d,c,e))&&l.checkPut(this,d,c,e))){if(w=this._getDirection(e,i)==="vertical",n=D(c),U("dragOverValid"),f.eventCanceled)return E;if(a)return I=x,j(),this._hideClone(),U("revert"),f.eventCanceled||(le?x.insertBefore(c,le):x.appendChild(c)),L(!0);var O=Dt(t,s.draggable);if(!O||wi(e,w,this)&&!O.animated){if(O===c)return L(!1);if(O&&t===e.target&&(i=O),i&&(o=D(i)),Je(x,t,c,n,i,o,e,!!i)!==!1)return j(),O&&O.nextSibling?t.insertBefore(c,O.nextSibling):t.appendChild(c),I=t,B(),L(!0)}else if(O&&Ei(e,w,this)){var re=ve(t,0,s,!0);if(re===c)return L(!1);if(i=re,o=D(i),Je(x,t,c,n,i,o,e,!1)!==!1)return j(),t.insertBefore(c,re),I=t,B(),L(!0)}else if(i.parentNode===t){o=D(i);var z=0,ne,Ie=c.parentNode!==t,R=!mi(c.animated&&c.toRect||n,i.animated&&i.toRect||o,w),Te=w?"top":"left",Q=Nt(i,"top","top")||Nt(c,"top","top"),De=Q?Q.scrollTop:void 0;he!==i&&(ne=o[Te],We=!1,Qe=!R&&s.invertSwap||Ie),z=xi(e,i,o,w,R?1:s.swapThreshold,s.invertedSwapThreshold==null?s.swapThreshold:s.invertedSwapThreshold,Qe,he===i);var G;if(z!==0){var oe=H(c);do oe-=z,G=I.children[oe];while(G&&(h(G,"display")==="none"||G===m))}if(z===0||G===i)return L(!1);he=i,Ve=z;var _e=i.nextElementSibling,Z=!1;Z=z===1;var Ye=Je(x,t,c,n,i,o,e,Z);if(Ye!==!1)return(Ye===1||Ye===-1)&&(Z=Ye===1),wt=!0,setTimeout(yi,30),j(),Z&&!_e?t.appendChild(c):i.parentNode.insertBefore(c,Z?_e:i),Q&&$t(Q,0,De-Q.scrollTop),I=c.parentNode,ne!==void 0&&!Qe&&(it=Math.abs(ne-D(i)[Te])),B(),L(!0)}if(t.contains(c))return L(!1)}return!1},_ignoreWhileAnimating:null,_offMoveEvents:function(){v(document,"mousemove",this._onTouchMove),v(document,"touchmove",this._onTouchMove),v(document,"pointermove",this._onTouchMove),v(document,"dragover",se),v(document,"mousemove",se),v(document,"touchmove",se)},_offUpEvents:function(){var e=this.el.ownerDocument;v(e,"mouseup",this._onDrop),v(e,"touchend",this._onDrop),v(e,"pointerup",this._onDrop),v(e,"pointercancel",this._onDrop),v(e,"touchcancel",this._onDrop),v(document,"selectstart",this)},_onDrop:function(e){var t=this.el,i=this.options;if(F=H(c),ee=H(c,i.draggable),A("drop",this,{evt:e}),I=c&&c.parentNode,F=H(c),ee=H(c,i.draggable),f.eventCanceled){this._nulling();return}fe=!1,Qe=!1,We=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),xt(this.cloneId),xt(this._dragStartId),this.nativeDraggable&&(v(document,"drop",this),v(t,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),He&&h(document.body,"user-select",""),h(c,"transform",""),e&&(Re&&(e.cancelable&&e.preventDefault(),!i.dropBubble&&e.stopPropagation()),m&&m.parentNode&&m.parentNode.removeChild(m),(x===I||C&&C.lastPutMode!=="clone")&&S&&S.parentNode&&S.parentNode.removeChild(S),c&&(this.nativeDraggable&&v(c,"dragend",this),vt(c),c.style["will-change"]="",Re&&!fe&&P(c,C?C.options.ghostClass:this.options.ghostClass,!1),P(c,this.options.chosenClass,!1),k({sortable:this,name:"unchoose",toEl:I,newIndex:null,newDraggableIndex:null,originalEvent:e}),x!==I?(F>=0&&(k({rootEl:I,name:"add",toEl:I,fromEl:x,originalEvent:e}),k({sortable:this,name:"remove",toEl:I,originalEvent:e}),k({rootEl:I,name:"sort",toEl:I,fromEl:x,originalEvent:e}),k({sortable:this,name:"sort",toEl:I,originalEvent:e})),C&&C.save()):F!==me&&F>=0&&(k({sortable:this,name:"update",toEl:I,originalEvent:e}),k({sortable:this,name:"sort",toEl:I,originalEvent:e})),f.active&&((F==null||F===-1)&&(F=me,ee=Be),k({sortable:this,name:"end",toEl:I,originalEvent:e}),this.save()))),this._nulling()},_nulling:function(){A("nulling",this),x=c=I=m=le=S=tt=te=ae=V=Re=F=ee=me=Be=he=Ve=C=Ke=f.dragged=f.ghost=f.clone=f.active=null,lt.forEach(function(e){e.checked=!0}),lt.length=ft=mt=0},handleEvent:function(e){switch(e.type){case"drop":case"dragend":this._onDrop(e);break;case"dragenter":case"dragover":c&&(this._onDragOver(e),bi(e));break;case"selectstart":e.preventDefault();break}},toArray:function(){for(var e=[],t,i=this.el.children,n=0,o=i.length,a=this.options;n<o;n++)t=i[n],W(t,a.draggable,this.el,!1)&&e.push(t.getAttribute(a.dataIdAttr)||Ii(t));return e},sort:function(e,t){var i={},n=this.el;this.toArray().forEach(function(o,a){var s=n.children[a];W(s,this.options.draggable,n,!1)&&(i[o]=s)},this),t&&this.captureAnimationState(),e.forEach(function(o){i[o]&&(n.removeChild(i[o]),n.appendChild(i[o]))}),t&&this.animateAll()},save:function(){var e=this.options.store;e&&e.set&&e.set(this)},closest:function(e,t){return W(e,t||this.options.draggable,this.el,!1)},option:function(e,t){var i=this.options;if(t===void 0)return i[e];var n=$e.modifyOption(this,e,t);typeof n<"u"?i[e]=n:i[e]=t,e==="group"&&Yt(i)},destroy:function(){A("destroy",this);var e=this.el;e[N]=null,v(e,"mousedown",this._onTapStart),v(e,"touchstart",this._onTapStart),v(e,"pointerdown",this._onTapStart),this.nativeDraggable&&(v(e,"dragover",this),v(e,"dragenter",this)),Array.prototype.forEach.call(e.querySelectorAll("[draggable]"),function(t){t.removeAttribute("draggable")}),this._onDrop(),this._disableDelayedDragEvents(),st.splice(st.indexOf(this.el),1),this.el=e=null},_hideClone:function(){if(!te){if(A("hideClone",this),f.eventCanceled)return;h(S,"display","none"),this.options.removeCloneOnHide&&S.parentNode&&S.parentNode.removeChild(S),te=!0}},_showClone:function(e){if(e.lastPutMode!=="clone"){this._hideClone();return}if(te){if(A("showClone",this),f.eventCanceled)return;c.parentNode==x&&!this.options.group.revertClone?x.insertBefore(S,c):le?x.insertBefore(S,le):x.appendChild(S),this.options.group.revertClone&&this.animate(c,S),h(S,"display",""),te=!1}}};function bi(r){r.dataTransfer&&(r.dataTransfer.dropEffect="move"),r.cancelable&&r.preventDefault()}function Je(r,e,t,i,n,o,a,s){var l,d=r[N],p=d.options.onMove,u;return window.CustomEvent&&!K&&!ze?l=new CustomEvent("move",{bubbles:!0,cancelable:!0}):(l=document.createEvent("Event"),l.initEvent("move",!0,!0)),l.to=e,l.from=r,l.dragged=t,l.draggedRect=i,l.related=n||e,l.relatedRect=o||D(e),l.willInsertAfter=s,l.originalEvent=a,r.dispatchEvent(l),p&&(u=p.call(d,l,a)),u}function vt(r){r.draggable=!1}function yi(){wt=!1}function Ei(r,e,t){var i=D(ve(t.el,0,t.options,!0)),n=jt(t.el,t.options,m),o=10;return e?r.clientX<n.left-o||r.clientY<i.top&&r.clientX<i.right:r.clientY<n.top-o||r.clientY<i.bottom&&r.clientX<i.left}function wi(r,e,t){var i=D(Dt(t.el,t.options.draggable)),n=jt(t.el,t.options,m),o=10;return e?r.clientX>n.right+o||r.clientY>i.bottom&&r.clientX>i.left:r.clientY>n.bottom+o||r.clientX>i.right&&r.clientY>i.top}function xi(r,e,t,i,n,o,a,s){var l=i?r.clientY:r.clientX,d=i?t.height:t.width,p=i?t.top:t.left,u=i?t.bottom:t.right,g=!1;if(!a){if(s&&it<d*n){if(!We&&(Ve===1?l>p+d*o/2:l<u-d*o/2)&&(We=!0),We)g=!0;else if(Ve===1?l<p+it:l>u-it)return-Ve}else if(l>p+d*(1-n)/2&&l<u-d*(1-n)/2)return Si(e)}return g=g||a,g&&(l<p+d*o/2||l>u-d*o/2)?l>p+d/2?1:-1:0}function Si(r){return H(c)<H(r)?1:-1}function Ii(r){for(var e=r.tagName+r.className+r.src+r.href+r.textContent,t=e.length,i=0;t--;)i+=e.charCodeAt(t);return i.toString(36)}function Ti(r){lt.length=0;for(var e=r.getElementsByTagName("input"),t=e.length;t--;){var i=e[t];i.checked&&lt.push(i)}}function rt(r){return setTimeout(r,0)}function xt(r){return clearTimeout(r)}ct&&b(document,"touchmove",function(r){(f.active||fe)&&r.cancelable&&r.preventDefault()});f.utils={on:b,off:v,css:h,find:Wt,is:function(e,t){return!!W(e,t,e,!1)},extend:si,throttle:zt,closest:W,toggleClass:P,clone:qt,index:H,nextTick:rt,cancelNextTick:xt,detectDirection:Xt,getChild:ve,expando:N};f.get=function(r){return r[N]};f.mount=function(){for(var r=arguments.length,e=new Array(r),t=0;t<r;t++)e[t]=arguments[t];e[0].constructor===Array&&(e=e[0]),e.forEach(function(i){if(!i.prototype||!i.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(i));i.utils&&(f.utils=q(q({},f.utils),i.utils)),$e.mount(i)})};f.create=function(r,e){return new f(r,e)};f.version=oi;var T=[],Pe,St,It=!1,bt,yt,dt,Fe;function Di(){function r(){this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0};for(var e in this)e.charAt(0)==="_"&&typeof this[e]=="function"&&(this[e]=this[e].bind(this))}return r.prototype={dragStarted:function(t){var i=t.originalEvent;this.sortable.nativeDraggable?b(document,"dragover",this._handleAutoScroll):this.options.supportPointer?b(document,"pointermove",this._handleFallbackAutoScroll):i.touches?b(document,"touchmove",this._handleFallbackAutoScroll):b(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(t){var i=t.originalEvent;!this.options.dragOverBubble&&!i.rootEl&&this._handleAutoScroll(i)},drop:function(){this.sortable.nativeDraggable?v(document,"dragover",this._handleAutoScroll):(v(document,"pointermove",this._handleFallbackAutoScroll),v(document,"touchmove",this._handleFallbackAutoScroll),v(document,"mousemove",this._handleFallbackAutoScroll)),Ht(),nt(),li()},nulling:function(){dt=St=Pe=It=Fe=bt=yt=null,T.length=0},_handleFallbackAutoScroll:function(t){this._handleAutoScroll(t,!0)},_handleAutoScroll:function(t,i){var n=this,o=(t.touches?t.touches[0]:t).clientX,a=(t.touches?t.touches[0]:t).clientY,s=document.elementFromPoint(o,a);if(dt=t,i||this.options.forceAutoScrollFallback||ze||K||He){Et(t,this.options,s,i);var l=ie(s,!0);It&&(!Fe||o!==bt||a!==yt)&&(Fe&&Ht(),Fe=setInterval(function(){var d=ie(document.elementFromPoint(o,a),!0);d!==l&&(l=d,nt()),Et(t,n.options,d,i)},10),bt=o,yt=a)}else{if(!this.options.bubbleScroll||ie(s,!0)===$()){nt();return}Et(t,this.options,ie(s,!1),!1)}}},Y(r,{pluginName:"scroll",initializeByDefault:!0})}function nt(){T.forEach(function(r){clearInterval(r.pid)}),T=[]}function Ht(){clearInterval(Fe)}var Et=zt(function(r,e,t,i){if(e.scroll){var n=(r.touches?r.touches[0]:r).clientX,o=(r.touches?r.touches[0]:r).clientY,a=e.scrollSensitivity,s=e.scrollSpeed,l=$(),d=!1,p;St!==t&&(St=t,nt(),Pe=e.scroll,p=e.scrollFn,Pe===!0&&(Pe=ie(t,!0)));var u=0,g=Pe;do{var w=g,y=D(w),E=y.top,U=y.bottom,j=y.left,L=y.right,B=y.width,O=y.height,re=void 0,z=void 0,ne=w.scrollWidth,Ie=w.scrollHeight,R=h(w),Te=w.scrollLeft,Q=w.scrollTop;w===l?(re=B<ne&&(R.overflowX==="auto"||R.overflowX==="scroll"||R.overflowX==="visible"),z=O<Ie&&(R.overflowY==="auto"||R.overflowY==="scroll"||R.overflowY==="visible")):(re=B<ne&&(R.overflowX==="auto"||R.overflowX==="scroll"),z=O<Ie&&(R.overflowY==="auto"||R.overflowY==="scroll"));var De=re&&(Math.abs(L-n)<=a&&Te+B<ne)-(Math.abs(j-n)<=a&&!!Te),G=z&&(Math.abs(U-o)<=a&&Q+O<Ie)-(Math.abs(E-o)<=a&&!!Q);if(!T[u])for(var oe=0;oe<=u;oe++)T[oe]||(T[oe]={});(T[u].vx!=De||T[u].vy!=G||T[u].el!==w)&&(T[u].el=w,T[u].vx=De,T[u].vy=G,clearInterval(T[u].pid),(De!=0||G!=0)&&(d=!0,T[u].pid=setInterval(function(){i&&this.layer===0&&f.active._onTouchMove(dt);var _e=T[this.layer].vy?T[this.layer].vy*s:0,Z=T[this.layer].vx?T[this.layer].vx*s:0;typeof p=="function"&&p.call(f.dragged.parentNode[N],Z,_e,r,dt,T[this.layer].el)!=="continue"||$t(T[this.layer].el,Z,_e)}.bind({layer:u}),24))),u++}while(e.bubbleScroll&&g!==l&&(g=ie(g,!1)));It=d}},30),Zt=function(e){var t=e.originalEvent,i=e.putSortable,n=e.dragEl,o=e.activeSortable,a=e.dispatchSortableEvent,s=e.hideGhostForTarget,l=e.unhideGhostForTarget;if(t){var d=i||o;s();var p=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:t,u=document.elementFromPoint(p.clientX,p.clientY);l(),d&&!d.el.contains(u)&&(a("spill"),this.onSpill({dragEl:n,putSortable:i}))}};function _t(){}_t.prototype={startIndex:null,dragStart:function(e){var t=e.oldDraggableIndex;this.startIndex=t},onSpill:function(e){var t=e.dragEl,i=e.putSortable;this.sortable.captureAnimationState(),i&&i.captureAnimationState();var n=ve(this.sortable.el,this.startIndex,this.options);n?this.sortable.el.insertBefore(t,n):this.sortable.el.appendChild(t),this.sortable.animateAll(),i&&i.animateAll()},drop:Zt};Y(_t,{pluginName:"revertOnSpill"});function Ct(){}Ct.prototype={onSpill:function(e){var t=e.dragEl,i=e.putSortable,n=i||this.sortable;n.captureAnimationState(),t.parentNode&&t.parentNode.removeChild(t),n.animateAll()},drop:Zt};Y(Ct,{pluginName:"removeOnSpill"});f.mount(new Di);f.mount(Ct,_t);var Jt=f;var qe=class{constructor(e,t){this.container=e;this.onReorder=t;this.sortable=null}get active(){return this.sortable!==null}enable(){this.sortable||(this.sortable=Jt.create(this.container,{animation:150,forceFallback:!0,ghostClass:"tile--ghost",chosenClass:"tile--chosen",dragClass:"tile--drag",fallbackTolerance:4,onEnd:()=>this.emitOrder()}))}disable(){this.sortable?.destroy(),this.sortable=null}emitOrder(){let e=Array.from(this.container.children).map(t=>t.dataset.id).filter(t=>!!t&&!isNaN(Number(t))).map(t=>parseInt(t,10));this.onReorder(e)}};var je=class r{static createOrUpdate(e,t,i,n=null){let o=n??r.build();return o.dataset.id=e.id.toString(),o.classList.toggle("is-selected",i),o.classList.toggle("is-main",e.isMain),o.classList.toggle("fit-contain",t==="contain"),r.updateImage(o,e,t),o}static build(){let e=document.createElement("div");e.className="tile";let t=document.createElement("img");t.draggable=!1,t.className="tile__img";let i=document.createElement("span");i.className="tile__badge",i.textContent="\u041E\u0431\u043B\u043E\u0436\u043A\u0430";let n=document.createElement("span");return n.className="tile__check",n.innerHTML=_.check(20),e.append(t,i,n),e}static updateImage(e,t,i){let n=e.querySelector("img.tile__img");n.getAttribute("src")!==t.previewUrl&&(n.src=t.previewUrl),n.alt=t.fileName,n.style.objectFit=i}};var _i=300,Ci=10,be=class r extends HTMLElement{constructor(t,i,n){super();this.dispatcher=t;this.previewFit=n;this.mode="normal";this.longPressTimer=null;this.pressStart=null;this.longPressFired=!1;this.style.setProperty("--tile-size",`${i}px`),this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=r.template(),this.grid=this.shadowRoot.querySelector(".grid"),this.reorder=new qe(this.grid,o=>this.emitSort(o)),this.bindEvents()}render(t,i,n){this.applyMode(i);let o=new Map;Array.from(this.grid.children).forEach(a=>{let s=a.dataset.id;s&&o.set(s,a)}),t.forEach(a=>{let s=o.get(a.id.toString())??null,l=je.createOrUpdate(a,this.previewFit,n.has(a.id),s);this.grid.appendChild(l),o.delete(a.id.toString())}),o.forEach(a=>a.remove())}disconnectedCallback(){this.reorder.disable(),this.clearLongPress()}applyMode(t){t!==this.mode&&(this.mode=t,this.grid.classList.remove("grid--normal","grid--selection","grid--reorder"),this.grid.classList.add(`grid--${t}`),t==="reorder"?this.reorder.enable():this.reorder.disable())}bindEvents(){this.grid.addEventListener("click",t=>this.handleClick(t)),this.grid.addEventListener("pointerdown",t=>this.handlePointerDown(t)),this.grid.addEventListener("pointermove",t=>this.handlePointerMove(t)),this.grid.addEventListener("pointerup",()=>this.clearLongPress()),this.grid.addEventListener("pointercancel",()=>this.clearLongPress()),this.grid.addEventListener("contextmenu",t=>{this.mode!=="reorder"&&t.preventDefault()})}handleClick(t){let i=this.tileFrom(t.target);if(!i)return;if(this.longPressFired){this.longPressFired=!1;return}let n=this.tileId(i);n!==null&&(this.mode==="selection"?this.dispatcher.publish("VIEW.TILE_TOGGLE_SELECT",{id:n}):this.mode==="normal"&&this.dispatcher.publish("VIEW.TILE_ACTIVATED",{id:n}))}handlePointerDown(t){if(this.mode!=="normal"||t.pointerType!=="touch")return;let i=this.tileFrom(t.target);if(!i)return;let n=this.tileId(i);n!==null&&(this.pressStart={x:t.clientX,y:t.clientY},this.longPressTimer=setTimeout(()=>{this.longPressFired=!0,navigator.vibrate?.(10),this.dispatcher.publish("VIEW.TILE_LONGPRESS",{id:n}),this.clearLongPress()},_i))}handlePointerMove(t){if(!this.pressStart)return;let i=t.clientX-this.pressStart.x,n=t.clientY-this.pressStart.y;Math.hypot(i,n)>Ci&&this.clearLongPress()}clearLongPress(){this.longPressTimer!==null&&(clearTimeout(this.longPressTimer),this.longPressTimer=null),this.pressStart=null}emitSort(t){let i=t.map((n,o)=>({id:n,sort:o}));this.dispatcher.publish("VIEW.SORT_CHANGED",i)}tileFrom(t){return t instanceof Element?t.closest(".tile"):null}tileId(t){let i=t.dataset.id;return i&&!isNaN(Number(i))?parseInt(i,10):null}static template(){return`
            <style>
                :host { display: block; width: 100%; }

                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(var(--tile-size), 1fr));
                    gap: 6px;
                    padding: 2px 0;
                }

                .tile {
                    position: relative;
                    width: 100%;
                    aspect-ratio: 1;
                    border-radius: 10px;
                    overflow: hidden;
                    background: var(--gu-tile-bg, #e9ecef);
                    box-shadow: 0 1px 2px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05);
                    border: 2px solid transparent;
                    transition: transform .18s ease, box-shadow .18s ease, border-color .15s ease;
                    -webkit-user-select: none;
                    user-select: none;
                }
                .tile__img {
                    width: 100%;
                    height: 100%;
                    display: block;
                    -webkit-user-drag: none;
                }
                /* \u0412 contain \u0434\u0430\u0451\u043C \u043F\u043E\u0434\u043B\u043E\u0436\u043A\u0443/\u043A\u043E\u043D\u0442\u0443\u0440, \u0438\u043D\u0430\u0447\u0435 \u043F\u043E\u043B\u044F \u0441\u043E\u0441\u0435\u0434\u043D\u0438\u0445 \u043F\u0440\u0435\u0432\u044C\u044E \u0441\u043B\u0438\u0432\u0430\u044E\u0442\u0441\u044F */
                .tile.fit-contain { background: var(--gu-surface, #f3f4f6); }
                .tile.fit-contain { border-color: var(--gu-border, #e5e7eb); }

                /* === \u0411\u0435\u0439\u0434\u0436 \xAB\u041E\u0431\u043B\u043E\u0436\u043A\u0430\xBB \u2014 \u0441\u0442\u0430\u0442\u0443\u0441 \u0433\u043B\u0430\u0432\u043D\u043E\u0433\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F === */
                .tile__badge {
                    position: absolute;
                    top: 6px; left: 6px;
                    display: none;
                    align-items: center;
                    padding: 3px 7px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: .03em;
                    text-transform: uppercase;
                    color: #1c1401;
                    background: var(--gu-cover, rgba(245,158,11,.95));
                    border-radius: 5px;
                    box-shadow: 0 1px 3px rgba(0,0,0,.2);
                    pointer-events: none;
                }
                .tile.is-main .tile__badge { display: inline-flex; }

                /* === \u0426\u0435\u043D\u0442\u0440\u0430\u043B\u044C\u043D\u0430\u044F \u0433\u0430\u043B\u043E\u0447\u043A\u0430 \u0432\u044B\u0431\u043E\u0440\u0430 (\u0432\u0438\u0434\u043D\u0430 \u0442\u043E\u043B\u044C\u043A\u043E \u0432 selection) === */
                .tile__check {
                    position: absolute;
                    inset: 0;
                    display: none;
                    align-items: center;
                    justify-content: center;
                    color: #fff;
                    background: rgba(17,24,39,.12);
                    transition: background .15s ease;
                    /* \u041E\u0432\u0435\u0440\u043B\u0435\u0439 \u0434\u0435\u043A\u043E\u0440\u0430\u0442\u0438\u0432\u043D\u044B\u0439: \u043A\u043B\u0438\u043A\u0438 \u0434\u043E\u043B\u0436\u043D\u0430 \u043B\u043E\u0432\u0438\u0442\u044C \u0441\u0430\u043C\u0430 \u043F\u043B\u0438\u0442\u043A\u0430, \u0430 \u043D\u0435 \u0438\u043A\u043E\u043D\u043A\u0430 */
                    pointer-events: none;
                }
                .tile__check > svg {
                    width: 44%;
                    height: 44%;
                    opacity: .55;
                    transform: scale(.9);
                    transition: opacity .15s ease, transform .15s ease;
                    filter: drop-shadow(0 1px 3px rgba(0,0,0,.5));
                }

                /* \u0420\u0435\u0436\u0438\u043C\u044B: \u043A\u0430\u043A \u0432\u0435\u0434\u0443\u0442 \u0441\u0435\u0431\u044F \u043F\u043B\u0438\u0442\u043A\u0438 */
                .grid--normal .tile { cursor: pointer; }
                .grid--normal .tile:hover {
                    transform: translateY(-3px) scale(1.02);
                    box-shadow: 0 8px 20px rgba(0,0,0,.12), 0 3px 6px rgba(0,0,0,.08);
                    z-index: 2;
                }

                .grid--selection .tile { cursor: pointer; }
                .grid--selection .tile__check { display: flex; }
                .grid--selection .tile.is-selected {
                    border-color: var(--gu-accent, #4f7df3);
                }
                .grid--selection .tile.is-selected .tile__check {
                    background: rgba(79,125,243,.35);
                }
                .grid--selection .tile.is-selected .tile__check > svg {
                    opacity: 1;
                    transform: scale(1);
                }

                .grid--reorder .tile { cursor: grab; touch-action: none; }
                .grid--reorder .tile:active { cursor: grabbing; }

                /* \u041A\u043B\u0430\u0441\u0441\u044B SortableJS */
                .tile--ghost { opacity: .35; }
                .tile--chosen { box-shadow: 0 8px 24px rgba(0,0,0,.22); }
                .tile--drag { transform: scale(1.05); opacity: .95; }

                @media (max-width: 640px) {
                    .grid { gap: 4px; }
                }
            </style>
            <div class="grid grid--normal"></div>
        `}};customElements.define("image-grid",be);var ye=class r extends HTMLElement{constructor(t,i,n){super();this.dispatcher=t;this.previewFit=n;this.style.setProperty("--tile-size",`${i}px`),this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=r.template(),this.grid=this.shadowRoot.querySelector(".queue"),this.label=this.shadowRoot.querySelector(".label")}render(t){this.label.classList.toggle("visible",t.length>0);let i=new Map;Array.from(this.grid.children).forEach(n=>{let o=n.dataset.id;o&&i.set(o,n)}),t.forEach((n,o)=>{let a=i.get(n.id.toString())??null,s=this.createOrUpdate(n,a);a||this.grid.insertBefore(s,this.grid.children[o]||null),i.delete(n.id.toString())}),i.forEach(n=>this.removeItem(n))}createOrUpdate(t,i){let n=i??this.build(t);n.dataset.id=t.id.toString(),n.classList.toggle("is-failed",t.status==="failed"),n.classList.toggle("is-uploading",t.status==="uploading"||t.status==="pending");let o=n.querySelector(".q-status");return t.status==="failed"?o.textContent=t.error?`\u041E\u0448\u0438\u0431\u043A\u0430: ${t.error}`:"\u041E\u0448\u0438\u0431\u043A\u0430":t.status==="uploading"?o.textContent=`${t.progress}%`:o.textContent="",n}build(t){let i=document.createElement("div");i.className="q-item";let n=document.createElement("img");n.className="q-img",n.draggable=!1;let o=URL.createObjectURL(t.file);n.src=o,n.alt=t.file.name,n.style.objectFit=this.previewFit,i.dataset.objectUrl=o;let a=document.createElement("button");a.type="button",a.className="q-del",a.title="\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043E\u0447\u0435\u0440\u0435\u0434\u0438",a.innerHTML=_.close(13),a.addEventListener("click",l=>{l.preventDefault(),this.dispatcher.publish("VIEW.IMAGE_DELETED",{type:"upload",id:t.id})});let s=document.createElement("div");return s.className="q-status",i.append(n,a,s),i}removeItem(t){let i=t.dataset.objectUrl;i&&URL.revokeObjectURL(i),t.remove()}static template(){return`
            <style>
                :host { display: block; width: 100%; }
                .label {
                    font-size: .72em; font-weight: 600; letter-spacing: .06em; text-transform: uppercase;
                    color: var(--gu-text-muted, #9ca3af); margin: 6px 0 8px;
                    display: none; align-items: center; gap: 8px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .label::after { content: ''; flex: 1; height: 1px; background: var(--gu-border, #e5e7eb); }
                .label.visible { display: flex; }

                .queue {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(var(--tile-size), 1fr));
                    gap: 6px;
                }
                .q-item {
                    position: relative;
                    aspect-ratio: 1;
                    border-radius: 10px; overflow: hidden;
                    background: var(--gu-tile-bg, #e9ecef);
                    border: 1.5px solid var(--gu-accent-soft, #93c5fd);
                }
                .q-item.is-failed { border-color: var(--gu-danger, #ef4444); }
                .q-img { width: 100%; height: 100%; display: block; -webkit-user-drag: none; }
                .q-del {
                    position: absolute; top: 5px; right: 5px;
                    display: inline-flex; align-items: center; justify-content: center;
                    padding: 4px; line-height: 1;
                    color: #fff; background: rgba(17,24,39,.55);
                    border: none; border-radius: 5px; cursor: pointer;
                    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
                    transition: background .15s ease;
                }
                .q-del:hover { background: var(--gu-danger, rgba(239,68,68,.92)); }
                .q-status {
                    position: absolute; left: 0; right: 0; bottom: 0;
                    padding: 3px 6px;
                    font: 600 10px/1.3 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    color: #fff; background: rgba(17,24,39,.55);
                    text-align: center;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                }
                .q-status:empty { display: none; }
                .q-item.is-failed .q-status { background: rgba(239,68,68,.9); }
            </style>
            <div class="label">\u0412\u044B\u0431\u0440\u0430\u043D\u043E \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438</div>
            <div class="queue"></div>
        `}};customElements.define("upload-queue",ye);var Mi=[{id:"set-main",label:"\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u043E\u0439",icon:_.star(15),placement:["bulk-toolbar"],bulk:!1,enabled:r=>r.selectedIds.length===1,run:(r,e)=>e.publish("VIEW.SET_MAIN_IMAGE",{id:r[0]})},{id:"delete",label:"\u0423\u0434\u0430\u043B\u0438\u0442\u044C",icon:_.trash(15),placement:["bulk-toolbar","inspector"],bulk:!0,enabled:r=>r.selectedIds.length>0,run:(r,e)=>e.publish("VIEW.IMAGES_DELETED",{ids:r})}];function pt(r){return Mi.filter(e=>e.placement.includes(r))}var Ee=class extends HTMLElement{constructor(t){super();this.dispatcher=t;this.actions=pt("bulk-toolbar");this.actionButtons=new Map;this.selection=[];this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=this.template(),this.countEl=this.shadowRoot.querySelector(".js-count"),this.buildActionButtons(),this.bindStatic(),this.style.display="none"}update(t,i){let n=[...t];this.selection=n,this.countEl.textContent=`\u0412\u044B\u0431\u0440\u0430\u043D\u043E: ${n.length}`;let o={images:i,selectedIds:n};this.actions.forEach(a=>{let s=this.actionButtons.get(a.id);s.disabled=a.enabled?!a.enabled(o):n.length===0})}setVisible(t){this.style.display=t?"block":"none"}buildActionButtons(){let t=this.shadowRoot.querySelector(".js-actions");this.actions.forEach(i=>{let n=this.makeButton(i);this.actionButtons.set(i.id,n),t.appendChild(n)})}makeButton(t){let i=document.createElement("button");return i.type="button",i.className=t.id==="delete"?"btn btn--danger":"btn",i.innerHTML=`${t.icon}<span>${t.label}</span>`,i.addEventListener("click",n=>{n.preventDefault(),!i.disabled&&t.run(this.selection.slice(),this.dispatcher)}),i}bindStatic(){this.shadowRoot.querySelector(".js-select-all").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.SELECT_ALL")}),this.shadowRoot.querySelector(".js-cancel").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.EXIT_MODE")})}template(){return`
            <style>
                :host { display: block; }
                .bar {
                    display: flex; align-items: center; gap: 10px;
                    padding: 8px 12px;
                    margin-bottom: 8px;
                    background: var(--gu-surface, #f3f4f6);
                    border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 10px;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                .count { font-size: 13px; font-weight: 600; color: var(--gu-text-strong, #1f2937); white-space: nowrap; }
                .spacer { flex: 1; }
                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 6px 12px;
                    font: 500 13px/1 inherit;
                    color: var(--gu-text, #374151);
                    background: #fff;
                    border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 7px;
                    cursor: pointer;
                    transition: background .15s ease, color .15s ease, border-color .15s ease, opacity .15s ease;
                }
                .btn:hover:not(:disabled) { background: #f3f4f6; color: var(--gu-text-strong, #1f2937); }
                .btn:disabled { opacity: .45; cursor: default; }
                .btn--danger { color: var(--gu-danger, #ef4444); border-color: rgba(239,68,68,.35); }
                .btn--danger:hover:not(:disabled) { background: rgba(239,68,68,.08); color: var(--gu-danger, #ef4444); }
                .btn--ghost { background: transparent; border-color: transparent; }
                svg { flex-shrink: 0; }

                /* \u041C\u043E\u0431\u0438\u043B\u043A\u0430: \u043F\u0430\u043D\u0435\u043B\u044C \u043F\u0440\u0438\u0436\u0430\u0442\u0430 \u043A \u043D\u0438\u0437\u0443 \u044D\u043A\u0440\u0430\u043D\u0430 */
                @media (max-width: 640px) {
                    .bar {
                        position: fixed;
                        left: 8px; right: 8px; bottom: 8px;
                        margin: 0;
                        z-index: 50;
                        box-shadow: 0 6px 24px rgba(0,0,0,.18);
                        flex-wrap: wrap;
                    }
                }
            </style>
            <div class="bar">
                <span class="count js-count">\u0412\u044B\u0431\u0440\u0430\u043D\u043E: 0</span>
                <button type="button" class="btn btn--ghost js-select-all">${_.select(15)} \u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u0451</button>
                <span class="spacer"></span>
                <span class="js-actions" style="display:inline-flex; gap:8px;"></span>
                <button type="button" class="btn btn--ghost js-cancel">${_.close(15)} \u041E\u0442\u043C\u0435\u043D\u0430</button>
            </div>
        `}};customElements.define("bulk-action-bar",Ee);var we=class extends HTMLElement{constructor(t,i){super();this.dispatcher=t;this.previewFit=i;this.deleteActions=pt("inspector");this.current=null;this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=this.template(),this.imgEl=this.shadowRoot.querySelector(".js-preview"),this.nameEl=this.shadowRoot.querySelector(".js-name"),this.coverBtn=this.shadowRoot.querySelector(".js-cover"),this.actionsSlot=this.shadowRoot.querySelector(".js-actions"),this.buildActions(),this.bind(),this.style.display="none"}update(t){if(this.current=t,!t){this.close();return}this.imgEl.src=t.previewUrl,this.imgEl.alt=t.fileName,this.imgEl.style.objectFit=this.previewFit,this.nameEl.textContent=t.fileName,this.renderCoverRole(t.isMain),this.open()}renderCoverRole(t){this.coverBtn.classList.toggle("role--active",t),this.coverBtn.disabled=t,this.coverBtn.innerHTML=t?`${_.star(15)}<span>\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043E\u0431\u043B\u043E\u0436\u043A\u0430</span>`:`${_.star(15)}<span>\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u043E\u0439</span>`}buildActions(){this.deleteActions.forEach(t=>{let i=document.createElement("button");i.type="button",i.className=t.id==="delete"?"btn btn--danger":"btn",i.innerHTML=`${t.icon}<span>${t.label}</span>`,i.addEventListener("click",n=>{n.preventDefault(),this.current&&t.run([this.current.id],this.dispatcher)}),this.actionsSlot.appendChild(i)})}bind(){this.coverBtn.addEventListener("click",t=>{t.preventDefault(),this.current&&!this.current.isMain&&this.dispatcher.publish("VIEW.SET_MAIN_IMAGE",{id:this.current.id})}),this.shadowRoot.querySelector(".js-close").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.CLOSE_INSPECTOR")}),this.shadowRoot.querySelector(".js-backdrop").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.CLOSE_INSPECTOR")})}open(){this.style.display="block",this.offsetWidth,this.shadowRoot.querySelector(".sheet").classList.add("sheet--open"),this.shadowRoot.querySelector(".js-backdrop").classList.add("backdrop--open")}close(){let t=this.shadowRoot.querySelector(".sheet"),i=this.shadowRoot.querySelector(".js-backdrop");t.classList.remove("sheet--open"),i.classList.remove("backdrop--open"),setTimeout(()=>{this.current||(this.style.display="none")},220)}template(){return`
            <style>
                :host { position: fixed; inset: 0; z-index: 60; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
                .js-backdrop {
                    position: absolute; inset: 0;
                    background: rgba(17,24,39,.35);
                    opacity: 0; transition: opacity .2s ease;
                }
                .js-backdrop.backdrop--open { opacity: 1; }

                .sheet {
                    position: absolute;
                    background: #fff;
                    display: flex; flex-direction: column;
                    box-shadow: -8px 0 30px rgba(0,0,0,.18);
                }
                /* \u0414\u0435\u0441\u043A\u0442\u043E\u043F: \u043F\u0430\u043D\u0435\u043B\u044C \u0441\u043F\u0440\u0430\u0432\u0430 */
                @media (min-width: 641px) {
                    .sheet {
                        top: 0; right: 0; bottom: 0;
                        width: min(380px, 92vw);
                        transform: translateX(100%);
                        transition: transform .22s ease;
                    }
                    .sheet--open { transform: translateX(0); }
                }
                /* \u041C\u043E\u0431\u0438\u043B\u043A\u0430: bottom sheet */
                @media (max-width: 640px) {
                    .sheet {
                        left: 0; right: 0; bottom: 0;
                        max-height: 85vh;
                        border-radius: 16px 16px 0 0;
                        transform: translateY(100%);
                        transition: transform .22s ease;
                    }
                    .sheet--open { transform: translateY(0); }
                }

                .head {
                    display: flex; align-items: center; justify-content: space-between;
                    padding: 14px 16px;
                    border-bottom: 1px solid var(--gu-border, #e5e7eb);
                }
                .head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--gu-text-strong, #1f2937); }
                .icon-btn {
                    display: inline-flex; align-items: center; justify-content: center;
                    width: 30px; height: 30px;
                    color: var(--gu-text, #6b7280);
                    background: transparent; border: none; border-radius: 7px; cursor: pointer;
                }
                .icon-btn:hover { background: var(--gu-surface, #f3f4f6); }

                .body { padding: 16px; overflow-y: auto; }
                .preview-wrap {
                    width: 100%; aspect-ratio: 1;
                    background: var(--gu-surface, #f3f4f6);
                    border-radius: 12px; overflow: hidden;
                    margin-bottom: 14px;
                }
                .js-preview { width: 100%; height: 100%; display: block; }

                .section { margin-bottom: 16px; }
                .section__title {
                    font-size: 11px; font-weight: 700; letter-spacing: .05em; text-transform: uppercase;
                    color: var(--gu-text-muted, #9ca3af); margin: 0 0 8px;
                }
                .filename { font-size: 13px; color: var(--gu-text, #374151); word-break: break-all; }

                .roles { display: flex; flex-wrap: wrap; gap: 8px; }
                .btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 8px 13px; font: 500 13px/1 inherit;
                    color: var(--gu-text, #374151);
                    background: #fff; border: 1px solid var(--gu-border, #e5e7eb);
                    border-radius: 8px; cursor: pointer;
                    transition: background .15s ease, color .15s ease, border-color .15s ease, opacity .15s ease;
                }
                .btn:hover:not(:disabled) { background: var(--gu-surface, #f3f4f6); }
                .btn:disabled { cursor: default; }
                .role--active {
                    color: #1c1401; background: var(--gu-cover, rgba(245,158,11,.95));
                    border-color: transparent; opacity: 1;
                }
                .btn--danger { color: var(--gu-danger, #ef4444); border-color: rgba(239,68,68,.35); }
                .btn--danger:hover { background: rgba(239,68,68,.08); }
                .actions { display: flex; flex-wrap: wrap; gap: 8px; }
                svg { flex-shrink: 0; }
            </style>
            <div class="js-backdrop"></div>
            <div class="sheet">
                <div class="head">
                    <h3>\u0421\u0432\u043E\u0439\u0441\u0442\u0432\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F</h3>
                    <button type="button" class="icon-btn js-close" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">${_.close(18)}</button>
                </div>
                <div class="body">
                    <div class="preview-wrap"><img class="js-preview" alt=""></div>

                    <div class="section">
                        <p class="section__title">\u0424\u0430\u0439\u043B</p>
                        <div class="filename js-name"></div>
                    </div>

                    <div class="section">
                        <p class="section__title">\u0420\u043E\u043B\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F</p>
                        <div class="roles">
                            <button type="button" class="btn js-cover"></button>
                        </div>
                    </div>

                    <!-- \u0422\u043E\u0447\u043A\u0430 \u0440\u0430\u0441\u0448\u0438\u0440\u0435\u043D\u0438\u044F: \u0441\u044E\u0434\u0430 \u0434\u043E\u0431\u0430\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u0431\u0443\u0434\u0443\u0449\u0438\u0435 \u0441\u0432\u043E\u0439\u0441\u0442\u0432\u0430
                         (alt-\u0442\u0435\u043A\u0441\u0442, \u043E\u043F\u0438\u0441\u0430\u043D\u0438\u0435, \u043A\u0440\u043E\u043F, \u043F\u043E\u0432\u043E\u0440\u043E\u0442, \u0437\u0430\u043C\u0435\u043D\u0430 \u0444\u0430\u0439\u043B\u0430) \u0431\u0435\u0437 \u043F\u0435\u0440\u0435\u0434\u0435\u043B\u043A\u0438 \u043A\u0430\u0440\u043A\u0430\u0441\u0430. -->
                    <div class="js-extra"></div>

                    <div class="section">
                        <p class="section__title">\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u044F</p>
                        <div class="actions js-actions"></div>
                    </div>
                </div>
            </div>
        `}};customElements.define("inspector-panel",we);var xe=class extends HTMLElement{constructor(){super();this.container=null;this.iconEl=null;this.titleEl=null;this.subtitleEl=null;this.attachShadow({mode:"open"}),this.build()}build(){let t=document.createElement("style");t.textContent=`
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes trash-wiggle {
                0%, 100% { transform: rotate(0deg) scale(1); }
                25%  { transform: rotate(-15deg) scale(1.1); }
                75%  { transform: rotate(15deg) scale(1.1); }
            }
            @keyframes upload-bounce {
                0%, 100% { transform: translateY(0); }
                50%       { transform: translateY(-8px); }
            }
            .preloader {
                display: none;
                position: absolute;
                inset: 0;
                background: rgba(255,255,255,0.88);
                backdrop-filter: blur(4px);
                -webkit-backdrop-filter: blur(4px);
                border-radius: inherit;
                z-index: 100;
                animation: fadeIn 0.18s ease;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                gap: 10px;
            }
            .preloader.visible {
                display: flex;
            }
            @media (max-width: 768px) {
                .preloader {
                    position: fixed;
                    border-radius: 0;
                }
            }
            .icon-wrap {
                width: 64px;
                height: 64px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .icon-wrap svg {
                width: 100%;
                height: 100%;
            }
            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #e5e7eb;
                border-top-color: #4f7df3;
                border-radius: 50%;
                animation: spin 0.75s linear infinite;
            }
            .icon-delete {
                color: #ef4444;
                animation: trash-wiggle 0.6s ease-in-out infinite;
            }
            .icon-upload {
                color: #4f7df3;
                animation: upload-bounce 0.8s ease-in-out infinite;
            }
            .title {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 0.9em;
                font-weight: 600;
                color: #374151;
                margin: 0;
            }
            .subtitle {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                font-size: 0.75em;
                color: #9ca3af;
                margin: 0;
            }
        `,this.container=document.createElement("div"),this.container.className="preloader";let i=document.createElement("div");i.className="icon-wrap",this.iconEl=i,this.titleEl=document.createElement("p"),this.titleEl.className="title",this.subtitleEl=document.createElement("p"),this.subtitleEl.className="subtitle",this.container.appendChild(i),this.container.appendChild(this.titleEl),this.container.appendChild(this.subtitleEl),this.shadowRoot.appendChild(t),this.shadowRoot.appendChild(this.container)}show(t="loading",i){this.applyMode(t,i),this.container.classList.add("visible")}updateProgress(t){this.subtitleEl&&(this.subtitleEl.textContent=`${Math.round(t)}%`)}setSubtitle(t){this.subtitleEl&&(this.subtitleEl.textContent=t)}hide(){this.container.classList.remove("visible")}applyMode(t,i){if(!(!this.iconEl||!this.titleEl||!this.subtitleEl)){if(this.iconEl.innerHTML="",t==="loading"){let n=document.createElement("div");n.className="spinner",this.iconEl.appendChild(n),this.titleEl.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",this.subtitleEl.textContent=""}else if(t==="delete"){let n=document.createElementNS("http://www.w3.org/2000/svg","svg");n.setAttribute("viewBox","0 0 16 16"),n.setAttribute("fill","currentColor"),n.classList.add("icon-delete"),n.innerHTML='<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>',this.iconEl.appendChild(n),this.titleEl.textContent="\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435...",this.subtitleEl.textContent=""}else if(t==="upload"){let n=document.createElementNS("http://www.w3.org/2000/svg","svg");n.setAttribute("viewBox","0 0 16 16"),n.setAttribute("fill","currentColor"),n.classList.add("icon-upload"),n.innerHTML='<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>',this.iconEl.appendChild(n),this.titleEl.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",this.subtitleEl.textContent=i!==void 0?`${Math.round(i)}%`:""}}}};customElements.define("preloader-wc",xe);var Ge=class{constructor(){this.hideTimer=null;let e=document.createElement("style");e.textContent=`
            @keyframes top-bar-shimmer {
                0% { background-position: 200% center; }
                100% { background-position: -200% center; }
            }
            .top-progress-bar {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 3px;
                z-index: 99999;
                pointer-events: none;
                display: none;
            }
            .top-progress-bar-inner {
                height: 100%;
                width: 0%;
                background: linear-gradient(90deg, #4f7df3, #10b981);
                transition: width 0.25s ease;
                border-radius: 0 99px 99px 0;
            }
            .top-progress-bar-inner.indeterminate {
                width: 100% !important;
                background: linear-gradient(90deg, #4f7df3 0%, #10b981 50%, #4f7df3 100%);
                background-size: 200% auto;
                animation: top-bar-shimmer 1.5s linear infinite;
                transition: none;
                border-radius: 0;
            }
        `,document.head.appendChild(e),this.bar=document.createElement("div"),this.bar.className="top-progress-bar",this.inner=document.createElement("div"),this.inner.className="top-progress-bar-inner",this.bar.appendChild(this.inner),document.body.appendChild(this.bar)}setProgress(e){this.cancelHideTimer(),this.inner.classList.remove("indeterminate"),this.bar.style.display="block",this.inner.style.width=`${Math.max(0,Math.min(100,e))}%`}setIndeterminate(){this.cancelHideTimer(),this.bar.style.display="block",this.inner.classList.add("indeterminate")}complete(){this.cancelHideTimer(),this.inner.classList.remove("indeterminate"),this.inner.style.width="100%",this.hideTimer=setTimeout(()=>{this.bar.style.display="none",this.inner.style.width="0%"},400)}cancelHideTimer(){this.hideTimer!==null&&(clearTimeout(this.hideTimer),this.hideTimer=null)}};var de=class de extends HTMLElement{constructor(){super();this.queue=[];this.current=null;this.autoCloseTimer=null;this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=de.template(),this.panel=this.shadowRoot.querySelector(".panel"),this.iconBox=this.shadowRoot.querySelector(".icon"),this.titleBox=this.shadowRoot.querySelector(".title"),this.messageBox=this.shadowRoot.querySelector(".message"),this.detailsBox=this.shadowRoot.querySelector(".details"),this.queueHint=this.shadowRoot.querySelector(".queue-hint"),this.shadowRoot.querySelector(".close").addEventListener("click",()=>this.closeCurrent())}notify(t){this.queue.push(t),this.current===null?this.showNext():this.updateQueueHint()}showNext(){this.clearAutoClose();let t=this.queue.shift()??null;if(this.current=t,t===null){this.classList.remove("open");return}this.renderContent(t),this.classList.add("open");let i=t.duration??(t.type==="success"?de.SUCCESS_DURATION_MS:0);i>0&&(this.autoCloseTimer=window.setTimeout(()=>this.closeCurrent(),i))}closeCurrent(){this.showNext()}renderContent(t){this.panel.dataset.type=t.type,this.iconBox.innerHTML=de.icon(t.type),this.titleBox.textContent=t.title??de.defaultTitle(t.type),this.messageBox.textContent=t.message,this.detailsBox.replaceChildren();let i=t.details??[];if(i.length>0){let n=document.createElement("ul");for(let o of i){let a=document.createElement("li");a.textContent=o,n.appendChild(a)}this.detailsBox.appendChild(n),this.detailsBox.hidden=!1}else this.detailsBox.hidden=!0;this.updateQueueHint()}updateQueueHint(){let t=this.queue.length;t>0?(this.queueHint.textContent=`\u0415\u0449\u0451 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0439: ${t}`,this.queueHint.hidden=!1):this.queueHint.hidden=!0}clearAutoClose(){this.autoCloseTimer!==null&&(window.clearTimeout(this.autoCloseTimer),this.autoCloseTimer=null)}static defaultTitle(t){switch(t){case"success":return"\u0413\u043E\u0442\u043E\u0432\u043E";case"error":return"\u041E\u0448\u0438\u0431\u043A\u0430";case"warning":return"\u041F\u0440\u0435\u0434\u0443\u043F\u0440\u0435\u0436\u0434\u0435\u043D\u0438\u0435";default:return"\u0418\u043D\u0444\u043E\u0440\u043C\u0430\u0446\u0438\u044F"}}static icon(t){let i=n=>`<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${n}</svg>`;switch(t){case"success":return i('<path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>');case"error":return i('<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>');case"warning":return i('<path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>');default:return i('<path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/><path d="m8.93 6.588-2.29.287-.082.38.45.083c.294.07.352.176.288.469l-.738 3.468c-.194.897.105 1.319.808 1.319.545 0 1.178-.252 1.465-.598l.088-.416c-.2.176-.492.246-.686.246-.275 0-.375-.193-.304-.533L8.93 6.588zM9 4.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>')}}static template(){return`
            <style>
                :host {
                    position: fixed;
                    inset: 0;
                    z-index: 2147483000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 24px;
                    background: rgba(17, 24, 39, .55);
                    opacity: 0;
                    visibility: hidden;
                    transition: opacity .18s ease, visibility .18s ease;
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }
                :host(.open) { opacity: 1; visibility: visible; }

                .panel {
                    --nm-accent: #4f7df3;
                    width: 33vw;
                    min-width: 340px;
                    max-width: 560px;
                    max-height: 80vh;
                    display: flex;
                    flex-direction: column;
                    background: #fff;
                    border-radius: 16px;
                    box-shadow: 0 24px 60px rgba(0, 0, 0, .35);
                    overflow: hidden;
                    transform: translateY(12px) scale(.98);
                    transition: transform .18s ease;
                }
                :host(.open) .panel { transform: translateY(0) scale(1); }

                .panel[data-type="success"] { --nm-accent: #16a34a; }
                .panel[data-type="error"]   { --nm-accent: #dc2626; }
                .panel[data-type="warning"] { --nm-accent: #d97706; }
                .panel[data-type="info"]    { --nm-accent: #2563eb; }

                .header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 18px 18px 14px;
                    border-top: 4px solid var(--nm-accent);
                }
                .icon {
                    flex: none;
                    display: inline-flex;
                    color: var(--nm-accent);
                }
                .title {
                    flex: 1;
                    margin: 0;
                    font-size: 1.05rem;
                    font-weight: 700;
                    color: #1f2937;
                }
                .close {
                    flex: none;
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 32px;
                    height: 32px;
                    padding: 0;
                    color: #6b7280;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: background .15s ease, color .15s ease;
                }
                .close:hover { background: #f3f4f6; color: #111827; }

                .body {
                    padding: 0 18px 18px;
                    overflow-y: auto;
                }
                .message {
                    margin: 0;
                    font-size: .95rem;
                    line-height: 1.5;
                    color: #374151;
                    white-space: pre-wrap;
                    word-break: break-word;
                }
                .details {
                    margin: 12px 0 0;
                    padding: 10px 12px;
                    background: #f9fafb;
                    border: 1px solid #e5e7eb;
                    border-radius: 10px;
                    max-height: 40vh;
                    overflow-y: auto;
                }
                .details[hidden] { display: none; }
                .details ul {
                    margin: 0;
                    padding-left: 18px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .details li {
                    font-size: .85rem;
                    line-height: 1.45;
                    color: #4b5563;
                    word-break: break-word;
                }

                .queue-hint {
                    padding: 10px 18px;
                    font-size: .78rem;
                    color: #9ca3af;
                    border-top: 1px solid #f3f4f6;
                }
                .queue-hint[hidden] { display: none; }

                @media (max-width: 640px) {
                    :host { padding: 0; }
                    .panel {
                        width: 100vw;
                        min-width: 0;
                        max-width: none;
                        height: 100vh;
                        max-height: none;
                        border-radius: 0;
                    }
                }
            </style>
            <div class="panel" role="alertdialog" aria-modal="true" data-type="info">
                <div class="header">
                    <span class="icon"></span>
                    <h2 class="title"></h2>
                    <button class="close" type="button" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/></svg>
                    </button>
                </div>
                <div class="body">
                    <p class="message"></p>
                    <div class="details" hidden></div>
                </div>
                <div class="queue-hint" hidden></div>
            </div>
        `}};de.SUCCESS_DURATION_MS=2500;var Se=de;customElements.define("gu-notification-modal",Se);var Xe=class{constructor(e,t,i,n="cover"){this.dispatcher=t;this.topBarActive=!1;this.wasUploading=!1;this.container=document.getElementById(e),this.container.innerHTML="",this.applyContainerStyles();let o=100*i;this.topBar=new Ge,this.toolbar=new pe(this.dispatcher),this.bulkBar=new Ee(this.dispatcher),this.grid=new be(this.dispatcher,o,n),this.queue=new ye(this.dispatcher,o,n),this.inspector=new we(this.dispatcher,n),this.preloader=new xe,this.notifier=new Se,document.body.appendChild(this.notifier);let a=new Oe(this.dispatcher),s=new ce(this.dispatcher),l=document.createElement("div");l.className="gu-upload-section",l.append(s,this.queue,a),this.container.append(this.toolbar,this.bulkBar,this.grid,l,this.preloader,this.inspector),this.bindGlobalKeys()}render(e){this.toolbar.update(e.uiMode,e.serverImages.length),this.grid.render(e.serverImages,e.uiMode,e.selectedIds),this.queue.render(e.uploadImages);let t=e.uiMode==="selection";this.bulkBar.setVisible(t),t&&this.bulkBar.update(e.selectedIds,e.serverImages),this.inspector.update(e.inspectorImage),e.isUploading?(this.wasUploading=!0,this.preloader.show("upload",e.overallProgress),this.preloader.setSubtitle(`${e.uploadDoneCount} \u0438\u0437 ${e.uploadTotalCount}`),this.topBar.setProgress(e.overallProgress)):(this.preloader.hide(),(this.wasUploading||this.topBarActive)&&(this.topBar.complete(),this.wasUploading=!1,this.topBarActive=!1))}notify(e){this.notifier.notify(e)}preloaderAction(e,t="loading",i="indeterminate"){e==="start"?(this.preloader.show(t),i==="determinate"?this.topBar.setProgress(0):this.topBar.setIndeterminate(),this.topBarActive=!0):this.preloader.hide()}busyProgress(e,t){this.topBar.setProgress(e),this.topBarActive=!0,t!==void 0&&this.preloader.setSubtitle(t)}topBarAction(e){e==="indeterminate"?(this.topBar.setIndeterminate(),this.topBarActive=!0):(this.topBar.complete(),this.topBarActive=!1)}bindGlobalKeys(){document.addEventListener("keydown",e=>{e.key==="Escape"&&(this.inspector.style.display!=="none"?this.dispatcher.publish("VIEW.CLOSE_INSPECTOR"):this.dispatcher.publish("VIEW.EXIT_MODE"))})}applyContainerStyles(){let e=document.createElement("style");e.textContent=`
            .gallery-upload {
                --gu-accent: #4f7df3;
                --gu-accent-hover: #3b6de0;
                --gu-accent-soft: #93c5fd;
                --gu-danger: #ef4444;
                --gu-cover: rgba(245,158,11,.95);
                --gu-surface: #f3f4f6;
                --gu-border: #e5e7eb;
                --gu-tile-bg: #e9ecef;
                --gu-text: #374151;
                --gu-text-strong: #1f2937;
                --gu-text-muted: #9ca3af;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                position: relative;
                display: flex;
                flex-direction: column;
            }
            .gallery-upload .gu-upload-section {
                border: 1px solid var(--gu-border);
                border-radius: 12px;
                padding: 12px;
                margin-top: 12px;
                background: #fafafa;
            }
        `,document.head.appendChild(e)}};function Tr(r){let e=new Me,t=new Ae(r.maxWidth||1920,r.maxHeight||1080),i=new Ne(r.headers,r.endpoints,r.ownerId,r.formNames),n=new Le(r.endpoints.upload,r.headers,t,e,r.ownerId,r.formNames.uploadImageForm,3),o=new Xe(r.containerId,e,r.imageScale||1,r.previewFit||"cover");new ke(t,o,i,n,e).init()}export{Tr as createGalleryWidget};
/*! Bundled license information:

sortablejs/modular/sortable.esm.js:
  (**!
   * Sortable 1.15.6
   * @author	RubaXa   <trash@rubaxa.org>
   * @author	owenm    <owen23355@gmail.com>
   * @license MIT
   *)
*/
//# sourceMappingURL=index.js.map
