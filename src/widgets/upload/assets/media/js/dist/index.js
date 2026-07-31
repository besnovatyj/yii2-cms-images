var Te=class{constructor(){this.subscriptions=new Map}subscribe(e,t){let i=this.subscriptions.get(e);return i||(i=[],this.subscriptions.set(e,i)),i.push(t),()=>{let o=i.indexOf(t);o!==-1&&(i.splice(o,1),i.length===0&&this.subscriptions.delete(e))}}publish(e,...t){let i=this.subscriptions.get(e);if(i)for(let o of i)o(...t)}};var Ce=class{constructor(e,t,i,o,n,a="AddImageForm",s=3){this.connector=e;this.headers=t;this.galleryState=i;this.dispatcher=o;this.ownerId=n;this.formName=a;this.currentUploads=0;this.uploadQueue=[];this.uploadStatus=[];this.maxConcurrentUploads=s}async uploadAll(){let e=this.galleryState.getUploadEntries();if(e.length===0)throw new Error("\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438");this.uploadStatus=e.map(o=>({uploadId:o.uploadId,fileName:o.file.name,progress:0,status:"pending"}));let t=e.map(o=>this.uploadFileQueued(o.uploadId,o.file).then(()=>({success:!0,fileName:o.file.name})).catch(n=>({success:!1,fileName:o.file.name,error:n instanceof Error?n.message:String(n)}))),i=await Promise.all(t);return{succeeded:i.filter(o=>o.success).length,failed:i.filter(o=>!o.success).map(o=>({fileName:o.fileName,error:o.error}))}}uploadFileQueued(e,t){return new Promise((i,o)=>{this.uploadQueue.push({uploadId:e,file:t,resolve:i,reject:o}),this.processQueue()})}processQueue(){for(;this.currentUploads<this.maxConcurrentUploads&&this.uploadQueue.length>0;){let{uploadId:e,file:t,resolve:i,reject:o}=this.uploadQueue.shift();this.currentUploads++,this.uploadFile(e,t).then(()=>{this.currentUploads--,this.processQueue(),i()}).catch(n=>{this.currentUploads--,this.processQueue(),o(n)})}}uploadFile(e,t){return new Promise((i,o)=>{let n=new XMLHttpRequest,a=new FormData;a.append(`${this.formName}[file]`,t),a.append(`${this.formName}[fileName]`,t.name),a.append(`${this.formName}[id]`,this.ownerId),a.append("method","upload");let s=this.uploadStatus.findIndex(l=>l.uploadId===e);if(s===-1)return o(new Error("\u0424\u0430\u0439\u043B \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D \u0432 \u0441\u0442\u0430\u0442\u0443\u0441\u0430\u0445 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438"));n.open("POST",this.connector,!0);for(let[l,d]of Object.entries(this.headers))n.setRequestHeader(l,d);n.upload.onprogress=l=>{if(l.lengthComputable){let d=Math.round(l.loaded/l.total*100);this.updateUploadStatus(s,{progress:d,status:"uploading"})}},n.onload=()=>{if(n.status>=200&&n.status<300)try{let l=JSON.parse(n.responseText);if(l.status==="success")this.updateUploadStatus(s,{progress:100,status:"completed"}),i();else{let d=l.data?.message??l.message??"\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430";this.updateUploadStatus(s,{progress:0,status:"failed",error:d}),o(new Error(d))}}catch{this.updateUploadStatus(s,{progress:0,status:"failed",error:"\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430"}),o(new Error("\u041D\u0435\u0432\u0435\u0440\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430"))}else this.updateUploadStatus(s,{progress:0,status:"failed",error:n.statusText}),o(new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: ${n.status}: ${n.statusText}`))},n.onerror=()=>{this.updateUploadStatus(s,{progress:0,status:"failed",error:"\u0421\u0435\u0442\u0435\u0432\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}),o(new Error("\u0421\u0435\u0442\u0435\u0432\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"))},n.send(a)})}updateUploadStatus(e,t){this.uploadStatus[e]={...this.uploadStatus[e],...t},this.dispatcher.publish("FileUploader:UploadStatusUpdate",this.uploadStatus)}};var Me=class{constructor(e,t,i,o,n){this.model=e;this.view=t;this.service=i;this.fileUploader=o;this.dispatcher=n;this.setupEventListeners()}async init(){this.view.preloaderAction("start");try{this.model.serverImages=await this.service.getImages(),this.view.render(this.model)}catch(e){console.error(e);let t=e instanceof Error?e.message:String(e);showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F: ${t}`,type:"error",duration:0})}finally{this.view.preloaderAction("stop")}}setupEventListeners(){this.dispatcher.subscribe("VIEW.FILES_DROPPED",e=>this.handleFilesAdded(e)),this.dispatcher.subscribe("VIEW.FILES_SELECTED",e=>this.handleFilesAdded(e)),this.dispatcher.subscribe("VIEW.UPLOAD_CLICKED",()=>this.handleUploadClicked()),this.dispatcher.subscribe("VIEW.CLEAR_CLICKED",()=>this.handleClearClicked()),this.dispatcher.subscribe("FileUploader:UploadStatusUpdate",e=>this.handleUploadStatusUpdate(e)),this.dispatcher.subscribe("VIEW.IMAGE_DELETED",e=>this.handleImageDeleted(e)),this.dispatcher.subscribe("VIEW.IMAGES_DELETED",e=>this.handleImagesDeleted(e.ids)),this.dispatcher.subscribe("VIEW.SET_MAIN_IMAGE",e=>this.handleSetMainImage(e)),this.dispatcher.subscribe("VIEW.SORT_CHANGED",e=>this.handleServerSortChanged(e)),this.dispatcher.subscribe("VIEW.ENTER_SELECTION",()=>this.transition(()=>this.model.enterSelection())),this.dispatcher.subscribe("VIEW.ENTER_REORDER",()=>this.transition(()=>this.model.enterReorder())),this.dispatcher.subscribe("VIEW.EXIT_MODE",()=>this.transition(()=>this.model.exitMode())),this.dispatcher.subscribe("VIEW.SELECT_ALL",()=>this.handleSelectAll()),this.dispatcher.subscribe("VIEW.TILE_TOGGLE_SELECT",e=>this.transition(()=>this.model.toggleSelected(e.id))),this.dispatcher.subscribe("VIEW.TILE_LONGPRESS",e=>this.transition(()=>{this.model.enterSelection(),this.model.toggleSelected(e.id)})),this.dispatcher.subscribe("VIEW.TILE_ACTIVATED",e=>this.transition(()=>this.model.setInspector(e.id))),this.dispatcher.subscribe("VIEW.CLOSE_INSPECTOR",()=>this.transition(()=>this.model.setInspector(null)))}transition(e){e(),this.view.render(this.model)}handleSelectAll(){let e=this.model.selectedIds.size===this.model.serverImages.length&&this.model.serverImages.length>0;this.transition(()=>e?this.model.clearSelection():this.model.selectAll())}async handleFilesAdded(e){let t=await this.model.addUploadImages(e);if(t.errors.length===1)showAlert({message:t.errors[0].message,type:"error",duration:0});else if(t.errors.length>1){let i=t.errors.map(o=>o.fileName).join(", ");showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0434\u043E\u0431\u0430\u0432\u0438\u0442\u044C ${t.errors.length} \u0444\u0430\u0439\u043B\u043E\u0432: ${i}`,type:"error",duration:0})}this.view.render(this.model)}handleImageDeleted(e){e.type==="upload"?(this.model.removeUploadImage(e.id),this.view.render(this.model)):this.handleImagesDeleted([e.id])}async handleImagesDeleted(e){if(e.length===0)return;let t=new Set(e),i=this.model.serverImages.some(p=>p.isMain&&t.has(p.id)),o=e.length;this.view.preloaderAction("start","delete","determinate"),this.view.busyProgress(0,`0 \u0438\u0437 ${o}`);let n=[],a=[],s=0;for(let p of e){try{await this.service.deleteImage(p),n.push(p)}catch(u){console.error(`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435 ${p}:`,u),a.push(p)}s++,this.view.busyProgress(s/o*100,`${s} \u0438\u0437 ${o}`)}let l=new Set(n),d=this.model.serverImages.filter(p=>!l.has(p.id));i&&d.length>0&&!d.some(p=>p.isMain)&&(d=d.map((p,u)=>({...p,isMain:u===0}))),this.model.serverImages=d,this.model.exitMode(),this.view.render(this.model),this.view.preloaderAction("stop"),a.length>0&&showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0434\u0430\u043B\u0438\u0442\u044C ${a.length} \u0438\u0437 ${e.length} \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0439`,type:"error",duration:0})}async handleServerSortChanged(e){this.view.topBarAction("indeterminate");try{await this.service.setNewSort(e);let t=new Map(e.map(i=>[i.id,i.sort]));this.model.serverImages=this.model.serverImages.map(i=>({...i,sort:t.get(i.id)??i.sort})).sort((i,o)=>i.sort-o.sort),this.view.render(this.model)}catch(t){let i=t instanceof Error?t.message:String(t);showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043D\u043E\u0432\u044B\u0439 \u043F\u043E\u0440\u044F\u0434\u043E\u043A: ${i}`,type:"error",duration:0}),this.view.render(this.model),this.view.topBarAction("complete")}}async handleUploadClicked(){if(this.model.uploadImages.length===0){showAlert({message:"\u041D\u0435\u0442 \u0444\u0430\u0439\u043B\u043E\u0432 \u0434\u043B\u044F \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438",type:"warning"});return}this.model.isUploading=!0,this.view.render(this.model);try{let e=await this.fileUploader.uploadAll();this.model.serverImages=await this.service.getImages(),this.model.clearUploadImages(),this.model.isUploading=!1,this.view.render(this.model),e.failed.length===0?showAlert({message:"\u0412\u0441\u0435 \u0444\u0430\u0439\u043B\u044B \u0443\u0441\u043F\u0435\u0448\u043D\u043E \u0437\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u044B",type:"success"}):e.succeeded>0?showAlert({message:`\u0417\u0430\u0433\u0440\u0443\u0436\u0435\u043D\u043E ${e.succeeded} \u0438\u0437 ${e.succeeded+e.failed.length} \u0444\u0430\u0439\u043B\u043E\u0432. \u041E\u0448\u0438\u0431\u043A\u0438: ${e.failed.map(t=>`${t.fileName}: ${t.error}`).join("; ")}`,type:"warning",duration:0}):showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u0444\u0430\u0439\u043B\u044B: ${e.failed.map(t=>`${t.fileName}: ${t.error}`).join("; ")}`,type:"error",duration:0})}catch(e){this.model.isUploading=!1,this.view.render(this.model);let t=e instanceof Error?e.message:String(e);showAlert({message:`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438: ${t}`,type:"error",duration:0})}}handleClearClicked(){this.model.clearUploadImages(),this.view.render(this.model)}async handleSetMainImage(e){this.view.topBarAction("indeterminate");try{await this.service.setMainImage(e.id),this.model.serverImages=this.model.serverImages.map(t=>({...t,isMain:t.id===e.id})),this.view.render(this.model)}catch(t){let i=t instanceof Error?t.message:String(t);showAlert({message:`\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0433\u043B\u0430\u0432\u043D\u043E\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u0435: ${i}`,type:"error",duration:0}),this.view.topBarAction("complete")}}handleUploadStatusUpdate(e){this.model.updateUploadStatus(e),this.view.render(this.model)}};var Le=class{constructor(e=1920,t=1080){this.maxWidth=e;this.maxHeight=t;this.isUploading=!1;this.overallProgress=0;this._filesToUploadList=null;this.nextUploadId=0;this._serverImages=[];this._uiMode="normal";this._selectedIds=new Set;this._inspectorImageId=null;this._uploadImages=[]}get serverImages(){return this._serverImages}set serverImages(e){this._serverImages=e,this.pruneUiRefs()}get uiMode(){return this._uiMode}get selectedIds(){return this._selectedIds}get inspectorImageId(){return this._inspectorImageId}get inspectorImage(){return this._inspectorImageId===null?null:this._serverImages.find(e=>e.id===this._inspectorImageId)??null}enterSelection(){this._uiMode="selection",this._inspectorImageId=null}enterReorder(){this._uiMode="reorder",this._selectedIds.clear(),this._inspectorImageId=null}exitMode(){this._uiMode="normal",this._selectedIds.clear()}isSelected(e){return this._selectedIds.has(e)}toggleSelected(e){return this._selectedIds.has(e)?(this._selectedIds.delete(e),!1):(this._selectedIds.add(e),!0)}selectAll(){this._selectedIds=new Set(this._serverImages.map(e=>e.id))}clearSelection(){this._selectedIds.clear()}setInspector(e){this._inspectorImageId=e}pruneUiRefs(){let e=new Set(this._serverImages.map(t=>t.id));for(let t of this._selectedIds)e.has(t)||this._selectedIds.delete(t);this._inspectorImageId!==null&&!e.has(this._inspectorImageId)&&(this._inspectorImageId=null)}get uploadImages(){return this._uploadImages}get uploadTotalCount(){return this._uploadImages.length}get uploadDoneCount(){return this._uploadImages.filter(e=>e.status==="completed"||e.status==="failed").length}async getImageResolution(e){return new Promise((t,i)=>{let o=new Image;o.src=URL.createObjectURL(e),o.onload=()=>{URL.revokeObjectURL(o.src),t({width:o.width,height:o.height})},o.onerror=()=>{URL.revokeObjectURL(o.src),i(new Error(`\u041E\u0448\u0438\u0431\u043A\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043A\u0438 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F ${e.name}`))}})}async addUploadImages(e){let t=[],i=[];for(let o=0;o<e.length;o++){let n=e[o];try{try{let{width:a,height:s}=await this.getImageResolution(n);if(a>this.maxWidth||s>this.maxHeight){i.push({fileName:n.name,message:`\u0424\u0430\u0439\u043B ${n.name} \u043F\u0440\u0435\u0432\u044B\u0448\u0430\u0435\u0442 \u0434\u043E\u043F\u0443\u0441\u0442\u0438\u043C\u043E\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u0435 ${this.maxWidth}x${this.maxHeight} \u043F\u0438\u043A\u0441\u0435\u043B\u0435\u0439 (\u0444\u0430\u043A\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0435: ${a}x${s})`});continue}}catch{}t.push(n),this._uploadImages.push({kind:"upload",id:this.nextUploadId++,file:e[o],status:"pending",progress:0})}catch(a){let s=a instanceof Error?a.message:String(a);i.push({fileName:n.name,message:`\u041E\u0448\u0438\u0431\u043A\u0430 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0438 \u0444\u0430\u0439\u043B\u0430 ${n.name}: ${s}`})}}return this.setFilesToUpload(t),{validFiles:t,errors:i}}removeUploadImage(e){this._uploadImages=this._uploadImages.filter(i=>i.id!==e);let t=this._uploadImages.map(i=>i.file);this.setFilesToUpload(t)}getUploadEntries(){return this._uploadImages.filter(e=>e.status==="pending"||e.status==="uploading").map(e=>({uploadId:e.id,file:e.file}))}getFilesToUpload(){return this._filesToUploadList}clearUploadImages(){this._uploadImages=[],this.setFilesToUpload([])}updateUploadStatus(e){e.forEach(o=>{let n=this._uploadImages.find(a=>a.id===o.uploadId);n&&(n.status=o.status,n.progress=o.progress,n.error=o.error)});let t=this._uploadImages.length,i=this._uploadImages.filter(o=>o.status==="completed"||o.status==="failed").length;this.overallProgress=t>0?i/t*100:0}reorderUploadImages(e){this._uploadImages=e.map(t=>this._uploadImages.find(i=>i.id===t))}setFilesToUpload(e){let t=new DataTransfer;e.forEach(i=>t.items.add(i)),this._filesToUploadList=t.files}};var Ae=class{constructor(e,t,i,o){this.headers=e;this.endpoints=t;this.ownerId=i;this.formNames=o}async getImages(){try{let e=new FormData;e.append(`${this.formNames.getImagesForm}[id]`,this.ownerId);let t=await fetch(this.endpoints.getImages,{method:"POST",headers:this.headers,body:e}),i=await this.handleResponse(t);if(typeof i!="object"||i===null)throw console.error("\u0414\u0430\u043D\u043D\u044B\u0435 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430 \u043D\u0435 \u044F\u0432\u043B\u044F\u044E\u0442\u0441\u044F \u043E\u0431\u044A\u0435\u043A\u0442\u043E\u043C:",i),new Error("\u041D\u0435\u043A\u043E\u0440\u0440\u0435\u043A\u0442\u043D\u044B\u0439 \u0444\u043E\u0440\u043C\u0430\u0442 \u0434\u0430\u043D\u043D\u044B\u0445 \u0441 \u0441\u0435\u0440\u0432\u0435\u0440\u0430");let o=Object.keys(i).filter(n=>!isNaN(Number(n))).map(n=>i[n]);return o.length===0?(console.warn("\u0421\u0435\u0440\u0432\u0435\u0440 \u0432\u0435\u0440\u043D\u0443\u043B \u0443\u0441\u043F\u0435\u0448\u043D\u044B\u0439 \u043E\u0442\u0432\u0435\u0442, \u043D\u043E \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0442:",i),[]):o.sort((n,a)=>n.sort-a.sort)}catch(e){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 getImages:",e),e}}async deleteImage(e){try{let t=new FormData;t.append(`${this.formNames.deleteImageForm}[id]`,this.ownerId),t.append(`${this.formNames.deleteImageForm}[imageId]`,String(e));let i=await fetch(this.endpoints.deleteImage,{method:"POST",headers:this.headers,body:t});await this.handleResponse(i)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 deleteImage:",t),t}}async setMainImage(e){try{let t=new FormData;t.append(`${this.formNames.setMainImageForm}[id]`,this.ownerId),t.append(`${this.formNames.setMainImageForm}[imageId]`,String(e));let i=await fetch(this.endpoints.setMainImage,{method:"POST",headers:this.headers,body:t});await this.handleResponse(i)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 setMainImage:",t),t}}async setNewSort(e){try{let t=new FormData;t.append(`${this.formNames.setNewSortForm}[id]`,this.ownerId),t.append(`${this.formNames.setNewSortForm}[sortOrder]`,JSON.stringify(e));let i=await fetch(this.endpoints.setNewSort,{method:"POST",headers:this.headers,body:t});await this.handleResponse(i)}catch(t){throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0432 setNewSort:",t),t}}async handleResponse(e){if(!e.ok)throw new Error(`HTTP \u043E\u0448\u0438\u0431\u043A\u0430 ${e.status}: ${e.statusText}`);let t=await e.json();if(t.status==="error"){let i=t.data,o=`\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430: ${t.message||i.message||"\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u0430\u044F \u043E\u0448\u0438\u0431\u043A\u0430"}`;throw console.error("\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430:",{message:i.message,file:i.file,line:i.line,code:i.code}),new Error(o)}if(t.status!=="success")throw console.error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043E\u0442\u0432\u0435\u0442\u0430:",t.status),new Error("\u041D\u0435\u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0439 \u0441\u0442\u0430\u0442\u0443\u0441 \u043E\u0442\u0432\u0435\u0442\u0430 \u0441\u0435\u0440\u0432\u0435\u0440\u0430");return t.data}};var de=class extends HTMLElement{constructor(e){super(),this.dispatcher=e,this.attachShadow({mode:"open"}),this.fileInput=document.createElement("input"),this.fileInput.type="file",this.fileInput.multiple=!0,this.fileInput.accept="image/*",this.fileInput.style.display="none",this.fileInput.addEventListener("change",this.handleFileSelect.bind(this));let t=document.createElement("style");t.textContent=`
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
        </svg>`;let o=document.createElement("p");o.className="drop-title";let n=document.createElement("p");n.className="drop-hint",window.FileReader?(o.textContent="\u041F\u0435\u0440\u0435\u0442\u0430\u0449\u0438\u0442\u0435 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u0441\u044E\u0434\u0430",n.textContent="\u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u0432\u044B\u0431\u043E\u0440\u0430 \u0444\u0430\u0439\u043B\u043E\u0432"):(o.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430 \u0444\u0430\u0439\u043B\u043E\u0432 \u043D\u0435 \u043F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0431\u0440\u0430\u0443\u0437\u0435\u0440\u043E\u043C",n.textContent="\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u0434\u043E \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0439 \u0432\u0435\u0440\u0441\u0438\u0438"),this.shadowRoot?.appendChild(t),this.shadowRoot?.appendChild(i),this.shadowRoot?.appendChild(o),this.shadowRoot?.appendChild(n),this.shadowRoot?.appendChild(this.fileInput),this.addEventListener("dragenter",this.handleDragEnter.bind(this)),this.addEventListener("dragleave",this.handleDragLeave.bind(this)),this.addEventListener("dragover",this.handleDragOver.bind(this)),this.addEventListener("drop",this.handleDrop.bind(this)),this.addEventListener("click",this.handleClick.bind(this))}handleDragEnter(e){e.preventDefault(),e.stopPropagation(),this.setAttribute("dragover","")}handleDragLeave(e){e.preventDefault(),e.stopPropagation(),this.removeAttribute("dragover")}handleDragOver(e){e.preventDefault(),e.stopPropagation(),e.dataTransfer&&(e.dataTransfer.dropEffect="copy")}handleDrop(e){e.preventDefault(),e.stopPropagation(),this.removeAttribute("dragover"),e.dataTransfer?.files&&this.dispatcher.publish("VIEW.FILES_DROPPED",e.dataTransfer.files)}handleClick(){this.fileInput.click()}handleFileSelect(e){this.fileInput.files&&this.dispatcher.publish("VIEW.FILES_SELECTED",this.fileInput.files)}};customElements.define("dropzone-wc",de);var ke=class extends HTMLElement{constructor(t){super();this.dispatcher=t;this.attachShadow({mode:"open"}),this.render(),this.uploadBtn=this.shadowRoot.querySelector("#gallery-upload-btn"),this.clearBtn=this.shadowRoot.querySelector("#gallery-clear-btn"),this.setupEventListeners()}render(){this.shadowRoot.innerHTML=`
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
        `}setupEventListeners(){this.uploadBtn.addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.UPLOAD_CLICKED")}),this.clearBtn.addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.CLEAR_CLICKED")})}};customElements.define("controls-component",ke);var J=(r,e)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${r}" height="${r}" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">${e}</svg>`,T={star:(r=16)=>J(r,'<path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/>'),trash:(r=16)=>J(r,'<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>'),upload:(r=16)=>J(r,'<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>'),clear:(r=16)=>J(r,'<path d="M2.5 1a1 1 0 0 0-1 1v1a1 1 0 0 0 1 1H3v9a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4h.5a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1H10a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1zm3 4a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5M8 5a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7A.5.5 0 0 1 8 5m3 .5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 1 0"/>'),check:(r=16)=>J(r,'<path d="M13.485 1.929a.75.75 0 0 1 .086 1.056l-7 8.5a.75.75 0 0 1-1.09.05l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.92 2.92 6.47-7.86a.75.75 0 0 1 1.054-.086z"/>'),close:(r=16)=>J(r,'<path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>'),select:(r=16)=>J(r,'<path d="M2.5 1A1.5 1.5 0 0 0 1 2.5v11A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-11A1.5 1.5 0 0 0 13.5 1zM2 2.5a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5z"/><path d="M10.97 5.47a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 9.01a.75.75 0 1 1 1.06-1.06l1.094 1.093 3.473-3.548z"/>'),reorder:(r=16)=>J(r,'<path d="M7 2a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zM7 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm-3 3a1 1 0 1 1-2 0 1 1 0 0 1 2 0zm3 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/>')};var ce=class extends HTMLElement{constructor(t){super();this.dispatcher=t;this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=this.template(),this.bind()}update(t,i){let o=i>0;this.toggle(".js-mode-buttons",o&&t==="normal"),this.toggle(".js-reorder-done",t==="reorder"),this.style.display=t==="normal"&&o||t==="reorder"?"block":"none"}bind(){this.on(".js-select","VIEW.ENTER_SELECTION"),this.on(".js-reorder","VIEW.ENTER_REORDER"),this.on(".js-reorder-done","VIEW.EXIT_MODE")}on(t,i){this.shadowRoot.querySelector(t).addEventListener("click",o=>{o.preventDefault(),this.dispatcher.publish(i)})}toggle(t,i){this.shadowRoot.querySelector(t).style.display=i?"flex":"none"}template(){return`
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
                    <button type="button" class="btn js-select">${T.select(15)} \u0412\u044B\u0431\u0440\u0430\u0442\u044C</button>
                    <button type="button" class="btn js-reorder">${T.reorder(15)} \u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043F\u043E\u0440\u044F\u0434\u043E\u043A</button>
                </span>
                <button type="button" class="btn btn--primary js-reorder-done" style="display:none;">
                    ${T.check(15)} \u0413\u043E\u0442\u043E\u0432\u043E
                </button>
            </div>
        `}};customElements.define("grid-toolbar",ce);function Ct(r,e){var t=Object.keys(r);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(r);e&&(i=i.filter(function(o){return Object.getOwnPropertyDescriptor(r,o).enumerable})),t.push.apply(t,i)}return t}function G(r){for(var e=1;e<arguments.length;e++){var t=arguments[e]!=null?arguments[e]:{};e%2?Ct(Object(t),!0).forEach(function(i){ei(r,i,t[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(r,Object.getOwnPropertyDescriptors(t)):Ct(Object(t)).forEach(function(i){Object.defineProperty(r,i,Object.getOwnPropertyDescriptor(t,i))})}return r}function Ze(r){"@babel/helpers - typeof";return typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?Ze=function(e){return typeof e}:Ze=function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},Ze(r)}function ei(r,e,t){return e in r?Object.defineProperty(r,e,{value:t,enumerable:!0,configurable:!0,writable:!0}):r[e]=t,r}function Y(){return Y=Object.assign||function(r){for(var e=1;e<arguments.length;e++){var t=arguments[e];for(var i in t)Object.prototype.hasOwnProperty.call(t,i)&&(r[i]=t[i])}return r},Y.apply(this,arguments)}function ti(r,e){if(r==null)return{};var t={},i=Object.keys(r),o,n;for(n=0;n<i.length;n++)o=i[n],!(e.indexOf(o)>=0)&&(t[o]=r[o]);return t}function ii(r,e){if(r==null)return{};var t=ti(r,e),i,o;if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(r);for(o=0;o<n.length;o++)i=n[o],!(e.indexOf(i)>=0)&&Object.prototype.propertyIsEnumerable.call(r,i)&&(t[i]=r[i])}return t}var ri="1.15.6";function X(r){if(typeof window<"u"&&window.navigator)return!!navigator.userAgent.match(r)}var K=X(/(?:Trident.*rv[ :]?11\.|msie|iemobile|Windows Phone)/i),Ve=X(/Edge/i),Mt=X(/firefox/i),Re=X(/safari/i)&&!X(/chrome/i)&&!X(/android/i),It=X(/iP(ad|od|hone)/i),Ft=X(/chrome/i)&&X(/android/i),Ut={capture:!1,passive:!1};function v(r,e,t){r.addEventListener(e,t,!K&&Ut)}function g(r,e,t){r.removeEventListener(e,t,!K&&Ut)}function rt(r,e){if(e){if(e[0]===">"&&(e=e.substring(1)),r)try{if(r.matches)return r.matches(e);if(r.msMatchesSelector)return r.msMatchesSelector(e);if(r.webkitMatchesSelector)return r.webkitMatchesSelector(e)}catch{return!1}return!1}}function Ht(r){return r.host&&r!==document&&r.host.nodeType?r.host:r.parentNode}function W(r,e,t,i){if(r){t=t||document;do{if(e!=null&&(e[0]===">"?r.parentNode===t&&rt(r,e):rt(r,e))||i&&r===t)return r;if(r===t)break}while(r=Ht(r))}return null}var Lt=/\s+/g;function R(r,e,t){if(r&&e)if(r.classList)r.classList[t?"add":"remove"](e);else{var i=(" "+r.className+" ").replace(Lt," ").replace(" "+e+" "," ");r.className=(i+(t?" "+e:"")).replace(Lt," ")}}function h(r,e,t){var i=r&&r.style;if(i){if(t===void 0)return document.defaultView&&document.defaultView.getComputedStyle?t=document.defaultView.getComputedStyle(r,""):r.currentStyle&&(t=r.currentStyle),e===void 0?t:t[e];!(e in i)&&e.indexOf("webkit")===-1&&(e="-webkit-"+e),i[e]=t+(typeof t=="string"?"":"px")}}function me(r,e){var t="";if(typeof r=="string")t=r;else do{var i=h(r,"transform");i&&i!=="none"&&(t=i+" "+t)}while(!e&&(r=r.parentNode));var o=window.DOMMatrix||window.WebKitCSSMatrix||window.CSSMatrix||window.MSCSSMatrix;return o&&new o(t)}function Bt(r,e,t){if(r){var i=r.getElementsByTagName(e),o=0,n=i.length;if(t)for(;o<n;o++)t(i[o],o);return i}return[]}function j(){var r=document.scrollingElement;return r||document.documentElement}function _(r,e,t,i,o){if(!(!r.getBoundingClientRect&&r!==window)){var n,a,s,l,d,p,u;if(r!==window&&r.parentNode&&r!==j()?(n=r.getBoundingClientRect(),a=n.top,s=n.left,l=n.bottom,d=n.right,p=n.height,u=n.width):(a=0,s=0,l=window.innerHeight,d=window.innerWidth,p=window.innerHeight,u=window.innerWidth),(e||t)&&r!==window&&(o=o||r.parentNode,!K))do if(o&&o.getBoundingClientRect&&(h(o,"transform")!=="none"||t&&h(o,"position")!=="static")){var b=o.getBoundingClientRect();a-=b.top+parseInt(h(o,"border-top-width")),s-=b.left+parseInt(h(o,"border-left-width")),l=a+n.height,d=s+n.width;break}while(o=o.parentNode);if(i&&r!==window){var w=me(o||r),E=w&&w.a,y=w&&w.d;w&&(a/=y,s/=E,u/=E,p/=y,l=a+p,d=s+u)}return{top:a,left:s,bottom:l,right:d,width:u,height:p}}}function At(r,e,t){for(var i=ie(r,!0),o=_(r)[e];i;){var n=_(i)[t],a=void 0;if(t==="top"||t==="left"?a=o>=n:a=o<=n,!a)return i;if(i===j())break;i=ie(i,!1)}return!1}function ge(r,e,t,i){for(var o=0,n=0,a=r.children;n<a.length;){if(a[n].style.display!=="none"&&a[n]!==f.ghost&&(i||a[n]!==f.dragged)&&W(a[n],t.draggable,r,!1)){if(o===e)return a[n];o++}n++}return null}function xt(r,e){for(var t=r.lastElementChild;t&&(t===f.ghost||h(t,"display")==="none"||e&&!rt(t,e));)t=t.previousElementSibling;return t||null}function U(r,e){var t=0;if(!r||!r.parentNode)return-1;for(;r=r.previousElementSibling;)r.nodeName.toUpperCase()!=="TEMPLATE"&&r!==f.clone&&(!e||rt(r,e))&&t++;return t}function kt(r){var e=0,t=0,i=j();if(r)do{var o=me(r),n=o.a,a=o.d;e+=r.scrollLeft*n,t+=r.scrollTop*a}while(r!==i&&(r=r.parentNode));return[e,t]}function oi(r,e){for(var t in r)if(r.hasOwnProperty(t)){for(var i in e)if(e.hasOwnProperty(i)&&e[i]===r[t][i])return Number(t)}return-1}function ie(r,e){if(!r||!r.getBoundingClientRect)return j();var t=r,i=!1;do if(t.clientWidth<t.scrollWidth||t.clientHeight<t.scrollHeight){var o=h(t);if(t.clientWidth<t.scrollWidth&&(o.overflowX=="auto"||o.overflowX=="scroll")||t.clientHeight<t.scrollHeight&&(o.overflowY=="auto"||o.overflowY=="scroll")){if(!t.getBoundingClientRect||t===document.body)return j();if(i||e)return t;i=!0}}while(t=t.parentNode);return j()}function ni(r,e){if(r&&e)for(var t in e)e.hasOwnProperty(t)&&(r[t]=e[t]);return r}function ct(r,e){return Math.round(r.top)===Math.round(e.top)&&Math.round(r.left)===Math.round(e.left)&&Math.round(r.height)===Math.round(e.height)&&Math.round(r.width)===Math.round(e.width)}var Fe;function Vt(r,e){return function(){if(!Fe){var t=arguments,i=this;t.length===1?r.call(i,t[0]):r.apply(i,t),Fe=setTimeout(function(){Fe=void 0},e)}}}function ai(){clearTimeout(Fe),Fe=void 0}function Wt(r,e,t){r.scrollLeft+=e,r.scrollTop+=t}function $t(r){var e=window.Polymer,t=window.jQuery||window.Zepto;return e&&e.dom?e.dom(r).cloneNode(!0):t?t(r).clone(!0)[0]:r.cloneNode(!0)}function jt(r,e,t){var i={};return Array.from(r.children).forEach(function(o){var n,a,s,l;if(!(!W(o,e.draggable,r,!1)||o.animated||o===t)){var d=_(o);i.left=Math.min((n=i.left)!==null&&n!==void 0?n:1/0,d.left),i.top=Math.min((a=i.top)!==null&&a!==void 0?a:1/0,d.top),i.right=Math.max((s=i.right)!==null&&s!==void 0?s:-1/0,d.right),i.bottom=Math.max((l=i.bottom)!==null&&l!==void 0?l:-1/0,d.bottom)}}),i.width=i.right-i.left,i.height=i.bottom-i.top,i.x=i.left,i.y=i.top,i}var N="Sortable"+new Date().getTime();function si(){var r=[],e;return{captureAnimationState:function(){if(r=[],!!this.options.animation){var i=[].slice.call(this.el.children);i.forEach(function(o){if(!(h(o,"display")==="none"||o===f.ghost)){r.push({target:o,rect:_(o)});var n=G({},r[r.length-1].rect);if(o.thisAnimationDuration){var a=me(o,!0);a&&(n.top-=a.f,n.left-=a.e)}o.fromRect=n}})}},addAnimationState:function(i){r.push(i)},removeAnimationState:function(i){r.splice(oi(r,{target:i}),1)},animateAll:function(i){var o=this;if(!this.options.animation){clearTimeout(e),typeof i=="function"&&i();return}var n=!1,a=0;r.forEach(function(s){var l=0,d=s.target,p=d.fromRect,u=_(d),b=d.prevFromRect,w=d.prevToRect,E=s.rect,y=me(d,!0);y&&(u.top-=y.f,u.left-=y.e),d.toRect=u,d.thisAnimationDuration&&ct(b,u)&&!ct(p,u)&&(E.top-u.top)/(E.left-u.left)===(p.top-u.top)/(p.left-u.left)&&(l=di(E,b,w,o.options)),ct(u,p)||(d.prevFromRect=p,d.prevToRect=u,l||(l=o.options.animation),o.animate(d,E,u,l)),l&&(n=!0,a=Math.max(a,l),clearTimeout(d.animationResetTimer),d.animationResetTimer=setTimeout(function(){d.animationTime=0,d.prevFromRect=null,d.fromRect=null,d.prevToRect=null,d.thisAnimationDuration=null},l),d.thisAnimationDuration=l)}),clearTimeout(e),n?e=setTimeout(function(){typeof i=="function"&&i()},a):typeof i=="function"&&i(),r=[]},animate:function(i,o,n,a){if(a){h(i,"transition",""),h(i,"transform","");var s=me(this.el),l=s&&s.a,d=s&&s.d,p=(o.left-n.left)/(l||1),u=(o.top-n.top)/(d||1);i.animatingX=!!p,i.animatingY=!!u,h(i,"transform","translate3d("+p+"px,"+u+"px,0)"),this.forRepaintDummy=li(i),h(i,"transition","transform "+a+"ms"+(this.options.easing?" "+this.options.easing:"")),h(i,"transform","translate3d(0,0,0)"),typeof i.animated=="number"&&clearTimeout(i.animated),i.animated=setTimeout(function(){h(i,"transition",""),h(i,"transform",""),i.animated=!1,i.animatingX=!1,i.animatingY=!1},a)}}}}function li(r){return r.offsetWidth}function di(r,e,t,i){return Math.sqrt(Math.pow(e.top-r.top,2)+Math.pow(e.left-r.left,2))/Math.sqrt(Math.pow(e.top-t.top,2)+Math.pow(e.left-t.left,2))*i.animation}var pe=[],pt={initializeByDefault:!0},We={mount:function(e){for(var t in pt)pt.hasOwnProperty(t)&&!(t in e)&&(e[t]=pt[t]);pe.forEach(function(i){if(i.pluginName===e.pluginName)throw"Sortable: Cannot mount plugin ".concat(e.pluginName," more than once")}),pe.push(e)},pluginEvent:function(e,t,i){var o=this;this.eventCanceled=!1,i.cancel=function(){o.eventCanceled=!0};var n=e+"Global";pe.forEach(function(a){t[a.pluginName]&&(t[a.pluginName][n]&&t[a.pluginName][n](G({sortable:t},i)),t.options[a.pluginName]&&t[a.pluginName][e]&&t[a.pluginName][e](G({sortable:t},i)))})},initializePlugins:function(e,t,i,o){pe.forEach(function(s){var l=s.pluginName;if(!(!e.options[l]&&!s.initializeByDefault)){var d=new s(e,t,e.options);d.sortable=e,d.options=e.options,e[l]=d,Y(i,d.defaults)}});for(var n in e.options)if(e.options.hasOwnProperty(n)){var a=this.modifyOption(e,n,e.options[n]);typeof a<"u"&&(e.options[n]=a)}},getEventProperties:function(e,t){var i={};return pe.forEach(function(o){typeof o.eventProperties=="function"&&Y(i,o.eventProperties.call(t[o.pluginName],e))}),i},modifyOption:function(e,t,i){var o;return pe.forEach(function(n){e[n.pluginName]&&n.optionListeners&&typeof n.optionListeners[t]=="function"&&(o=n.optionListeners[t].call(e[n.pluginName],i))}),o}};function ci(r){var e=r.sortable,t=r.rootEl,i=r.name,o=r.targetEl,n=r.cloneEl,a=r.toEl,s=r.fromEl,l=r.oldIndex,d=r.newIndex,p=r.oldDraggableIndex,u=r.newDraggableIndex,b=r.originalEvent,w=r.putSortable,E=r.extraEventProperties;if(e=e||t&&t[N],!!e){var y,H=e.options,z="on"+i.charAt(0).toUpperCase()+i.substr(1);window.CustomEvent&&!K&&!Ve?y=new CustomEvent(i,{bubbles:!0,cancelable:!0}):(y=document.createEvent("Event"),y.initEvent(i,!0,!0)),y.to=a||t,y.from=s||t,y.item=o||t,y.clone=n,y.oldIndex=l,y.newIndex=d,y.oldDraggableIndex=p,y.newDraggableIndex=u,y.originalEvent=b,y.pullMode=w?w.lastPutMode:void 0;var L=G(G({},E),We.getEventProperties(i,e));for(var B in L)y[B]=L[B];t&&t.dispatchEvent(y),H[z]&&H[z].call(e,y)}}var pi=["evt"],k=function(e,t){var i=arguments.length>2&&arguments[2]!==void 0?arguments[2]:{},o=i.evt,n=ii(i,pi);We.pluginEvent.bind(f)(e,t,G({dragEl:c,parentEl:x,ghostEl:m,rootEl:S,nextEl:le,lastDownEl:Je,cloneEl:I,cloneHidden:te,dragStarted:Ne,putSortable:C,activeSortable:f.active,originalEvent:o,oldIndex:fe,oldDraggableIndex:Ue,newIndex:F,newDraggableIndex:ee,hideGhostForTarget:Xt,unhideGhostForTarget:Yt,cloneNowHidden:function(){te=!0},cloneNowShown:function(){te=!1},dispatchSortableEvent:function(s){A({sortable:t,name:s,originalEvent:o})}},n))};function A(r){ci(G({putSortable:C,cloneEl:I,targetEl:c,rootEl:S,oldIndex:fe,oldDraggableIndex:Ue,newIndex:F,newDraggableIndex:ee},r))}var c,x,m,S,le,Je,I,te,fe,F,Ue,ee,Xe,C,he=!1,ot=!1,nt=[],ae,V,ut,ht,Nt,Ot,Ne,ue,He,Be=!1,Ye=!1,et,M,ft=[],Et=!1,at=[],lt=typeof document<"u",Ke=It,Pt=Ve||K?"cssFloat":"float",ui=lt&&!Ft&&!It&&"draggable"in document.createElement("div"),Gt=function(){if(lt){if(K)return!1;var r=document.createElement("x");return r.style.cssText="pointer-events:auto",r.style.pointerEvents==="auto"}}(),zt=function(e,t){var i=h(e),o=parseInt(i.width)-parseInt(i.paddingLeft)-parseInt(i.paddingRight)-parseInt(i.borderLeftWidth)-parseInt(i.borderRightWidth),n=ge(e,0,t),a=ge(e,1,t),s=n&&h(n),l=a&&h(a),d=s&&parseInt(s.marginLeft)+parseInt(s.marginRight)+_(n).width,p=l&&parseInt(l.marginLeft)+parseInt(l.marginRight)+_(a).width;if(i.display==="flex")return i.flexDirection==="column"||i.flexDirection==="column-reverse"?"vertical":"horizontal";if(i.display==="grid")return i.gridTemplateColumns.split(" ").length<=1?"vertical":"horizontal";if(n&&s.float&&s.float!=="none"){var u=s.float==="left"?"left":"right";return a&&(l.clear==="both"||l.clear===u)?"vertical":"horizontal"}return n&&(s.display==="block"||s.display==="flex"||s.display==="table"||s.display==="grid"||d>=o&&i[Pt]==="none"||a&&i[Pt]==="none"&&d+p>o)?"vertical":"horizontal"},hi=function(e,t,i){var o=i?e.left:e.top,n=i?e.right:e.bottom,a=i?e.width:e.height,s=i?t.left:t.top,l=i?t.right:t.bottom,d=i?t.width:t.height;return o===s||n===l||o+a/2===s+d/2},fi=function(e,t){var i;return nt.some(function(o){var n=o[N].options.emptyInsertThreshold;if(!(!n||xt(o))){var a=_(o),s=e>=a.left-n&&e<=a.right+n,l=t>=a.top-n&&t<=a.bottom+n;if(s&&l)return i=o}}),i},qt=function(e){function t(n,a){return function(s,l,d,p){var u=s.options.group.name&&l.options.group.name&&s.options.group.name===l.options.group.name;if(n==null&&(a||u))return!0;if(n==null||n===!1)return!1;if(a&&n==="clone")return n;if(typeof n=="function")return t(n(s,l,d,p),a)(s,l,d,p);var b=(a?s:l).options.group.name;return n===!0||typeof n=="string"&&n===b||n.join&&n.indexOf(b)>-1}}var i={},o=e.group;(!o||Ze(o)!="object")&&(o={name:o}),i.name=o.name,i.checkPull=t(o.pull,!0),i.checkPut=t(o.put),i.revertClone=o.revertClone,e.group=i},Xt=function(){!Gt&&m&&h(m,"display","none")},Yt=function(){!Gt&&m&&h(m,"display","")};lt&&!Ft&&document.addEventListener("click",function(r){if(ot)return r.preventDefault(),r.stopPropagation&&r.stopPropagation(),r.stopImmediatePropagation&&r.stopImmediatePropagation(),ot=!1,!1},!0);var se=function(e){if(c){e=e.touches?e.touches[0]:e;var t=fi(e.clientX,e.clientY);if(t){var i={};for(var o in e)e.hasOwnProperty(o)&&(i[o]=e[o]);i.target=i.rootEl=t,i.preventDefault=void 0,i.stopPropagation=void 0,t[N]._onDragOver(i)}}},mi=function(e){c&&c.parentNode[N]._isOutsideThisEl(e.target)};function f(r,e){if(!(r&&r.nodeType&&r.nodeType===1))throw"Sortable: `el` must be an HTMLElement, not ".concat({}.toString.call(r));this.el=r,this.options=e=Y({},e),r[N]=this;var t={group:null,sort:!0,disabled:!1,store:null,handle:null,draggable:/^[uo]l$/i.test(r.nodeName)?">li":">*",swapThreshold:1,invertSwap:!1,invertedSwapThreshold:null,removeCloneOnHide:!0,direction:function(){return zt(r,this.options)},ghostClass:"sortable-ghost",chosenClass:"sortable-chosen",dragClass:"sortable-drag",ignore:"a, img",filter:null,preventOnFilter:!0,animation:0,easing:null,setData:function(a,s){a.setData("Text",s.textContent)},dropBubble:!1,dragoverBubble:!1,dataIdAttr:"data-id",delay:0,delayOnTouchOnly:!1,touchStartThreshold:(Number.parseInt?Number:window).parseInt(window.devicePixelRatio,10)||1,forceFallback:!1,fallbackClass:"sortable-fallback",fallbackOnBody:!1,fallbackTolerance:0,fallbackOffset:{x:0,y:0},supportPointer:f.supportPointer!==!1&&"PointerEvent"in window&&(!Re||It),emptyInsertThreshold:5};We.initializePlugins(this,r,t);for(var i in t)!(i in e)&&(e[i]=t[i]);qt(e);for(var o in this)o.charAt(0)==="_"&&typeof this[o]=="function"&&(this[o]=this[o].bind(this));this.nativeDraggable=e.forceFallback?!1:ui,this.nativeDraggable&&(this.options.touchStartThreshold=1),e.supportPointer?v(r,"pointerdown",this._onTapStart):(v(r,"mousedown",this._onTapStart),v(r,"touchstart",this._onTapStart)),this.nativeDraggable&&(v(r,"dragover",this),v(r,"dragenter",this)),nt.push(this.el),e.store&&e.store.get&&this.sort(e.store.get(this)||[]),Y(this,si())}f.prototype={constructor:f,_isOutsideThisEl:function(e){!this.el.contains(e)&&e!==this.el&&(ue=null)},_getDirection:function(e,t){return typeof this.options.direction=="function"?this.options.direction.call(this,e,t,c):this.options.direction},_onTapStart:function(e){if(e.cancelable){var t=this,i=this.el,o=this.options,n=o.preventOnFilter,a=e.type,s=e.touches&&e.touches[0]||e.pointerType&&e.pointerType==="touch"&&e,l=(s||e).target,d=e.target.shadowRoot&&(e.path&&e.path[0]||e.composedPath&&e.composedPath()[0])||l,p=o.filter;if(Ii(i),!c&&!(/mousedown|pointerdown/.test(a)&&e.button!==0||o.disabled)&&!d.isContentEditable&&!(!this.nativeDraggable&&Re&&l&&l.tagName.toUpperCase()==="SELECT")&&(l=W(l,o.draggable,i,!1),!(l&&l.animated)&&Je!==l)){if(fe=U(l),Ue=U(l,o.draggable),typeof p=="function"){if(p.call(this,e,l,this)){A({sortable:t,rootEl:d,name:"filter",targetEl:l,toEl:i,fromEl:i}),k("filter",t,{evt:e}),n&&e.preventDefault();return}}else if(p&&(p=p.split(",").some(function(u){if(u=W(d,u.trim(),i,!1),u)return A({sortable:t,rootEl:u,name:"filter",targetEl:l,fromEl:i,toEl:i}),k("filter",t,{evt:e}),!0}),p)){n&&e.preventDefault();return}o.handle&&!W(d,o.handle,i,!1)||this._prepareDragStart(e,s,l)}}},_prepareDragStart:function(e,t,i){var o=this,n=o.el,a=o.options,s=n.ownerDocument,l;if(i&&!c&&i.parentNode===n){var d=_(i);if(S=n,c=i,x=c.parentNode,le=c.nextSibling,Je=i,Xe=a.group,f.dragged=c,ae={target:c,clientX:(t||e).clientX,clientY:(t||e).clientY},Nt=ae.clientX-d.left,Ot=ae.clientY-d.top,this._lastX=(t||e).clientX,this._lastY=(t||e).clientY,c.style["will-change"]="all",l=function(){if(k("delayEnded",o,{evt:e}),f.eventCanceled){o._onDrop();return}o._disableDelayedDragEvents(),!Mt&&o.nativeDraggable&&(c.draggable=!0),o._triggerDragStart(e,t),A({sortable:o,name:"choose",originalEvent:e}),R(c,a.chosenClass,!0)},a.ignore.split(",").forEach(function(p){Bt(c,p.trim(),mt)}),v(s,"dragover",se),v(s,"mousemove",se),v(s,"touchmove",se),a.supportPointer?(v(s,"pointerup",o._onDrop),!this.nativeDraggable&&v(s,"pointercancel",o._onDrop)):(v(s,"mouseup",o._onDrop),v(s,"touchend",o._onDrop),v(s,"touchcancel",o._onDrop)),Mt&&this.nativeDraggable&&(this.options.touchStartThreshold=4,c.draggable=!0),k("delayStart",this,{evt:e}),a.delay&&(!a.delayOnTouchOnly||t)&&(!this.nativeDraggable||!(Ve||K))){if(f.eventCanceled){this._onDrop();return}a.supportPointer?(v(s,"pointerup",o._disableDelayedDrag),v(s,"pointercancel",o._disableDelayedDrag)):(v(s,"mouseup",o._disableDelayedDrag),v(s,"touchend",o._disableDelayedDrag),v(s,"touchcancel",o._disableDelayedDrag)),v(s,"mousemove",o._delayedDragTouchMoveHandler),v(s,"touchmove",o._delayedDragTouchMoveHandler),a.supportPointer&&v(s,"pointermove",o._delayedDragTouchMoveHandler),o._dragStartTimer=setTimeout(l,a.delay)}else l()}},_delayedDragTouchMoveHandler:function(e){var t=e.touches?e.touches[0]:e;Math.max(Math.abs(t.clientX-this._lastX),Math.abs(t.clientY-this._lastY))>=Math.floor(this.options.touchStartThreshold/(this.nativeDraggable&&window.devicePixelRatio||1))&&this._disableDelayedDrag()},_disableDelayedDrag:function(){c&&mt(c),clearTimeout(this._dragStartTimer),this._disableDelayedDragEvents()},_disableDelayedDragEvents:function(){var e=this.el.ownerDocument;g(e,"mouseup",this._disableDelayedDrag),g(e,"touchend",this._disableDelayedDrag),g(e,"touchcancel",this._disableDelayedDrag),g(e,"pointerup",this._disableDelayedDrag),g(e,"pointercancel",this._disableDelayedDrag),g(e,"mousemove",this._delayedDragTouchMoveHandler),g(e,"touchmove",this._delayedDragTouchMoveHandler),g(e,"pointermove",this._delayedDragTouchMoveHandler)},_triggerDragStart:function(e,t){t=t||e.pointerType=="touch"&&e,!this.nativeDraggable||t?this.options.supportPointer?v(document,"pointermove",this._onTouchMove):t?v(document,"touchmove",this._onTouchMove):v(document,"mousemove",this._onTouchMove):(v(c,"dragend",this),v(S,"dragstart",this._onDragStart));try{document.selection?tt(function(){document.selection.empty()}):window.getSelection().removeAllRanges()}catch{}},_dragStarted:function(e,t){if(he=!1,S&&c){k("dragStarted",this,{evt:t}),this.nativeDraggable&&v(document,"dragover",mi);var i=this.options;!e&&R(c,i.dragClass,!1),R(c,i.ghostClass,!0),f.active=this,e&&this._appendGhost(),A({sortable:this,name:"start",originalEvent:t})}else this._nulling()},_emulateDragOver:function(){if(V){this._lastX=V.clientX,this._lastY=V.clientY,Xt();for(var e=document.elementFromPoint(V.clientX,V.clientY),t=e;e&&e.shadowRoot&&(e=e.shadowRoot.elementFromPoint(V.clientX,V.clientY),e!==t);)t=e;if(c.parentNode[N]._isOutsideThisEl(e),t)do{if(t[N]){var i=void 0;if(i=t[N]._onDragOver({clientX:V.clientX,clientY:V.clientY,target:e,rootEl:t}),i&&!this.options.dragoverBubble)break}e=t}while(t=Ht(t));Yt()}},_onTouchMove:function(e){if(ae){var t=this.options,i=t.fallbackTolerance,o=t.fallbackOffset,n=e.touches?e.touches[0]:e,a=m&&me(m,!0),s=m&&a&&a.a,l=m&&a&&a.d,d=Ke&&M&&kt(M),p=(n.clientX-ae.clientX+o.x)/(s||1)+(d?d[0]-ft[0]:0)/(s||1),u=(n.clientY-ae.clientY+o.y)/(l||1)+(d?d[1]-ft[1]:0)/(l||1);if(!f.active&&!he){if(i&&Math.max(Math.abs(n.clientX-this._lastX),Math.abs(n.clientY-this._lastY))<i)return;this._onDragStart(e,!0)}if(m){a?(a.e+=p-(ut||0),a.f+=u-(ht||0)):a={a:1,b:0,c:0,d:1,e:p,f:u};var b="matrix(".concat(a.a,",").concat(a.b,",").concat(a.c,",").concat(a.d,",").concat(a.e,",").concat(a.f,")");h(m,"webkitTransform",b),h(m,"mozTransform",b),h(m,"msTransform",b),h(m,"transform",b),ut=p,ht=u,V=n}e.cancelable&&e.preventDefault()}},_appendGhost:function(){if(!m){var e=this.options.fallbackOnBody?document.body:S,t=_(c,!0,Ke,!0,e),i=this.options;if(Ke){for(M=e;h(M,"position")==="static"&&h(M,"transform")==="none"&&M!==document;)M=M.parentNode;M!==document.body&&M!==document.documentElement?(M===document&&(M=j()),t.top+=M.scrollTop,t.left+=M.scrollLeft):M=j(),ft=kt(M)}m=c.cloneNode(!0),R(m,i.ghostClass,!1),R(m,i.fallbackClass,!0),R(m,i.dragClass,!0),h(m,"transition",""),h(m,"transform",""),h(m,"box-sizing","border-box"),h(m,"margin",0),h(m,"top",t.top),h(m,"left",t.left),h(m,"width",t.width),h(m,"height",t.height),h(m,"opacity","0.8"),h(m,"position",Ke?"absolute":"fixed"),h(m,"zIndex","100000"),h(m,"pointerEvents","none"),f.ghost=m,e.appendChild(m),h(m,"transform-origin",Nt/parseInt(m.style.width)*100+"% "+Ot/parseInt(m.style.height)*100+"%")}},_onDragStart:function(e,t){var i=this,o=e.dataTransfer,n=i.options;if(k("dragStart",this,{evt:e}),f.eventCanceled){this._onDrop();return}k("setupClone",this),f.eventCanceled||(I=$t(c),I.removeAttribute("id"),I.draggable=!1,I.style["will-change"]="",this._hideClone(),R(I,this.options.chosenClass,!1),f.clone=I),i.cloneId=tt(function(){k("clone",i),!f.eventCanceled&&(i.options.removeCloneOnHide||S.insertBefore(I,c),i._hideClone(),A({sortable:i,name:"clone"}))}),!t&&R(c,n.dragClass,!0),t?(ot=!0,i._loopId=setInterval(i._emulateDragOver,50)):(g(document,"mouseup",i._onDrop),g(document,"touchend",i._onDrop),g(document,"touchcancel",i._onDrop),o&&(o.effectAllowed="move",n.setData&&n.setData.call(i,o,c)),v(document,"drop",i),h(c,"transform","translateZ(0)")),he=!0,i._dragStartId=tt(i._dragStarted.bind(i,t,e)),v(document,"selectstart",i),Ne=!0,window.getSelection().removeAllRanges(),Re&&h(document.body,"user-select","none")},_onDragOver:function(e){var t=this.el,i=e.target,o,n,a,s=this.options,l=s.group,d=f.active,p=Xe===l,u=s.sort,b=C||d,w,E=this,y=!1;if(Et)return;function H(_e,Zt){k(_e,E,G({evt:e,isOwner:p,axis:w?"vertical":"horizontal",revert:a,dragRect:o,targetRect:n,canSort:u,fromSortable:b,target:i,completed:L,onMove:function(Tt,Jt){return Qe(S,t,c,o,Tt,_(Tt),e,Jt)},changed:B},Zt))}function z(){H("dragOverAnimationCapture"),E.captureAnimationState(),E!==b&&b.captureAnimationState()}function L(_e){return H("dragOverCompleted",{insertion:_e}),_e&&(p?d._hideClone():d._showClone(E),E!==b&&(R(c,C?C.options.ghostClass:d.options.ghostClass,!1),R(c,s.ghostClass,!0)),C!==E&&E!==f.active?C=E:E===f.active&&C&&(C=null),b===E&&(E._ignoreWhileAnimating=i),E.animateAll(function(){H("dragOverAnimationComplete"),E._ignoreWhileAnimating=null}),E!==b&&(b.animateAll(),b._ignoreWhileAnimating=null)),(i===c&&!c.animated||i===t&&!i.animated)&&(ue=null),!s.dragoverBubble&&!e.rootEl&&i!==document&&(c.parentNode[N]._isOutsideThisEl(e.target),!_e&&se(e)),!s.dragoverBubble&&e.stopPropagation&&e.stopPropagation(),y=!0}function B(){F=U(c),ee=U(c,s.draggable),A({sortable:E,name:"change",toEl:t,newIndex:F,newDraggableIndex:ee,originalEvent:e})}if(e.preventDefault!==void 0&&e.cancelable&&e.preventDefault(),i=W(i,s.draggable,t,!0),H("dragOver"),f.eventCanceled)return y;if(c.contains(e.target)||i.animated&&i.animatingX&&i.animatingY||E._ignoreWhileAnimating===i)return L(!1);if(ot=!1,d&&!s.disabled&&(p?u||(a=x!==S):C===this||(this.lastPutMode=Xe.checkPull(this,d,c,e))&&l.checkPut(this,d,c,e))){if(w=this._getDirection(e,i)==="vertical",o=_(c),H("dragOverValid"),f.eventCanceled)return y;if(a)return x=S,z(),this._hideClone(),H("revert"),f.eventCanceled||(le?S.insertBefore(c,le):S.appendChild(c)),L(!0);var O=xt(t,s.draggable);if(!O||Ei(e,w,this)&&!O.animated){if(O===c)return L(!1);if(O&&t===e.target&&(i=O),i&&(n=_(i)),Qe(S,t,c,o,i,n,e,!!i)!==!1)return z(),O&&O.nextSibling?t.insertBefore(c,O.nextSibling):t.appendChild(c),x=t,B(),L(!0)}else if(O&&bi(e,w,this)){var re=ge(t,0,s,!0);if(re===c)return L(!1);if(i=re,n=_(i),Qe(S,t,c,o,i,n,e,!1)!==!1)return z(),t.insertBefore(c,re),x=t,B(),L(!0)}else if(i.parentNode===t){n=_(i);var $=0,oe,Se=c.parentNode!==t,P=!hi(c.animated&&c.toRect||o,i.animated&&i.toRect||n,w),Ie=w?"top":"left",Q=At(i,"top","top")||At(c,"top","top"),xe=Q?Q.scrollTop:void 0;ue!==i&&(oe=n[Ie],Be=!1,Ye=!P&&s.invertSwap||Se),$=yi(e,i,n,w,P?1:s.swapThreshold,s.invertedSwapThreshold==null?s.swapThreshold:s.invertedSwapThreshold,Ye,ue===i);var q;if($!==0){var ne=U(c);do ne-=$,q=x.children[ne];while(q&&(h(q,"display")==="none"||q===m))}if($===0||q===i)return L(!1);ue=i,He=$;var De=i.nextElementSibling,Z=!1;Z=$===1;var qe=Qe(S,t,c,o,i,n,e,Z);if(qe!==!1)return(qe===1||qe===-1)&&(Z=qe===1),Et=!0,setTimeout(vi,30),z(),Z&&!De?t.appendChild(c):i.parentNode.insertBefore(c,Z?De:i),Q&&Wt(Q,0,xe-Q.scrollTop),x=c.parentNode,oe!==void 0&&!Ye&&(et=Math.abs(oe-_(i)[Ie])),B(),L(!0)}if(t.contains(c))return L(!1)}return!1},_ignoreWhileAnimating:null,_offMoveEvents:function(){g(document,"mousemove",this._onTouchMove),g(document,"touchmove",this._onTouchMove),g(document,"pointermove",this._onTouchMove),g(document,"dragover",se),g(document,"mousemove",se),g(document,"touchmove",se)},_offUpEvents:function(){var e=this.el.ownerDocument;g(e,"mouseup",this._onDrop),g(e,"touchend",this._onDrop),g(e,"pointerup",this._onDrop),g(e,"pointercancel",this._onDrop),g(e,"touchcancel",this._onDrop),g(document,"selectstart",this)},_onDrop:function(e){var t=this.el,i=this.options;if(F=U(c),ee=U(c,i.draggable),k("drop",this,{evt:e}),x=c&&c.parentNode,F=U(c),ee=U(c,i.draggable),f.eventCanceled){this._nulling();return}he=!1,Ye=!1,Be=!1,clearInterval(this._loopId),clearTimeout(this._dragStartTimer),yt(this.cloneId),yt(this._dragStartId),this.nativeDraggable&&(g(document,"drop",this),g(t,"dragstart",this._onDragStart)),this._offMoveEvents(),this._offUpEvents(),Re&&h(document.body,"user-select",""),h(c,"transform",""),e&&(Ne&&(e.cancelable&&e.preventDefault(),!i.dropBubble&&e.stopPropagation()),m&&m.parentNode&&m.parentNode.removeChild(m),(S===x||C&&C.lastPutMode!=="clone")&&I&&I.parentNode&&I.parentNode.removeChild(I),c&&(this.nativeDraggable&&g(c,"dragend",this),mt(c),c.style["will-change"]="",Ne&&!he&&R(c,C?C.options.ghostClass:this.options.ghostClass,!1),R(c,this.options.chosenClass,!1),A({sortable:this,name:"unchoose",toEl:x,newIndex:null,newDraggableIndex:null,originalEvent:e}),S!==x?(F>=0&&(A({rootEl:x,name:"add",toEl:x,fromEl:S,originalEvent:e}),A({sortable:this,name:"remove",toEl:x,originalEvent:e}),A({rootEl:x,name:"sort",toEl:x,fromEl:S,originalEvent:e}),A({sortable:this,name:"sort",toEl:x,originalEvent:e})),C&&C.save()):F!==fe&&F>=0&&(A({sortable:this,name:"update",toEl:x,originalEvent:e}),A({sortable:this,name:"sort",toEl:x,originalEvent:e})),f.active&&((F==null||F===-1)&&(F=fe,ee=Ue),A({sortable:this,name:"end",toEl:x,originalEvent:e}),this.save()))),this._nulling()},_nulling:function(){k("nulling",this),S=c=x=m=le=I=Je=te=ae=V=Ne=F=ee=fe=Ue=ue=He=C=Xe=f.dragged=f.ghost=f.clone=f.active=null,at.forEach(function(e){e.checked=!0}),at.length=ut=ht=0},handleEvent:function(e){switch(e.type){case"drop":case"dragend":this._onDrop(e);break;case"dragenter":case"dragover":c&&(this._onDragOver(e),gi(e));break;case"selectstart":e.preventDefault();break}},toArray:function(){for(var e=[],t,i=this.el.children,o=0,n=i.length,a=this.options;o<n;o++)t=i[o],W(t,a.draggable,this.el,!1)&&e.push(t.getAttribute(a.dataIdAttr)||Si(t));return e},sort:function(e,t){var i={},o=this.el;this.toArray().forEach(function(n,a){var s=o.children[a];W(s,this.options.draggable,o,!1)&&(i[n]=s)},this),t&&this.captureAnimationState(),e.forEach(function(n){i[n]&&(o.removeChild(i[n]),o.appendChild(i[n]))}),t&&this.animateAll()},save:function(){var e=this.options.store;e&&e.set&&e.set(this)},closest:function(e,t){return W(e,t||this.options.draggable,this.el,!1)},option:function(e,t){var i=this.options;if(t===void 0)return i[e];var o=We.modifyOption(this,e,t);typeof o<"u"?i[e]=o:i[e]=t,e==="group"&&qt(i)},destroy:function(){k("destroy",this);var e=this.el;e[N]=null,g(e,"mousedown",this._onTapStart),g(e,"touchstart",this._onTapStart),g(e,"pointerdown",this._onTapStart),this.nativeDraggable&&(g(e,"dragover",this),g(e,"dragenter",this)),Array.prototype.forEach.call(e.querySelectorAll("[draggable]"),function(t){t.removeAttribute("draggable")}),this._onDrop(),this._disableDelayedDragEvents(),nt.splice(nt.indexOf(this.el),1),this.el=e=null},_hideClone:function(){if(!te){if(k("hideClone",this),f.eventCanceled)return;h(I,"display","none"),this.options.removeCloneOnHide&&I.parentNode&&I.parentNode.removeChild(I),te=!0}},_showClone:function(e){if(e.lastPutMode!=="clone"){this._hideClone();return}if(te){if(k("showClone",this),f.eventCanceled)return;c.parentNode==S&&!this.options.group.revertClone?S.insertBefore(I,c):le?S.insertBefore(I,le):S.appendChild(I),this.options.group.revertClone&&this.animate(c,I),h(I,"display",""),te=!1}}};function gi(r){r.dataTransfer&&(r.dataTransfer.dropEffect="move"),r.cancelable&&r.preventDefault()}function Qe(r,e,t,i,o,n,a,s){var l,d=r[N],p=d.options.onMove,u;return window.CustomEvent&&!K&&!Ve?l=new CustomEvent("move",{bubbles:!0,cancelable:!0}):(l=document.createEvent("Event"),l.initEvent("move",!0,!0)),l.to=e,l.from=r,l.dragged=t,l.draggedRect=i,l.related=o||e,l.relatedRect=n||_(e),l.willInsertAfter=s,l.originalEvent=a,r.dispatchEvent(l),p&&(u=p.call(d,l,a)),u}function mt(r){r.draggable=!1}function vi(){Et=!1}function bi(r,e,t){var i=_(ge(t.el,0,t.options,!0)),o=jt(t.el,t.options,m),n=10;return e?r.clientX<o.left-n||r.clientY<i.top&&r.clientX<i.right:r.clientY<o.top-n||r.clientY<i.bottom&&r.clientX<i.left}function Ei(r,e,t){var i=_(xt(t.el,t.options.draggable)),o=jt(t.el,t.options,m),n=10;return e?r.clientX>o.right+n||r.clientY>i.bottom&&r.clientX>i.left:r.clientY>o.bottom+n||r.clientX>i.right&&r.clientY>i.top}function yi(r,e,t,i,o,n,a,s){var l=i?r.clientY:r.clientX,d=i?t.height:t.width,p=i?t.top:t.left,u=i?t.bottom:t.right,b=!1;if(!a){if(s&&et<d*o){if(!Be&&(He===1?l>p+d*n/2:l<u-d*n/2)&&(Be=!0),Be)b=!0;else if(He===1?l<p+et:l>u-et)return-He}else if(l>p+d*(1-o)/2&&l<u-d*(1-o)/2)return wi(e)}return b=b||a,b&&(l<p+d*n/2||l>u-d*n/2)?l>p+d/2?1:-1:0}function wi(r){return U(c)<U(r)?1:-1}function Si(r){for(var e=r.tagName+r.className+r.src+r.href+r.textContent,t=e.length,i=0;t--;)i+=e.charCodeAt(t);return i.toString(36)}function Ii(r){at.length=0;for(var e=r.getElementsByTagName("input"),t=e.length;t--;){var i=e[t];i.checked&&at.push(i)}}function tt(r){return setTimeout(r,0)}function yt(r){return clearTimeout(r)}lt&&v(document,"touchmove",function(r){(f.active||he)&&r.cancelable&&r.preventDefault()});f.utils={on:v,off:g,css:h,find:Bt,is:function(e,t){return!!W(e,t,e,!1)},extend:ni,throttle:Vt,closest:W,toggleClass:R,clone:$t,index:U,nextTick:tt,cancelNextTick:yt,detectDirection:zt,getChild:ge,expando:N};f.get=function(r){return r[N]};f.mount=function(){for(var r=arguments.length,e=new Array(r),t=0;t<r;t++)e[t]=arguments[t];e[0].constructor===Array&&(e=e[0]),e.forEach(function(i){if(!i.prototype||!i.prototype.constructor)throw"Sortable: Mounted plugin must be a constructor function, not ".concat({}.toString.call(i));i.utils&&(f.utils=G(G({},f.utils),i.utils)),We.mount(i)})};f.create=function(r,e){return new f(r,e)};f.version=ri;var D=[],Oe,wt,St=!1,gt,vt,st,Pe;function xi(){function r(){this.defaults={scroll:!0,forceAutoScrollFallback:!1,scrollSensitivity:30,scrollSpeed:10,bubbleScroll:!0};for(var e in this)e.charAt(0)==="_"&&typeof this[e]=="function"&&(this[e]=this[e].bind(this))}return r.prototype={dragStarted:function(t){var i=t.originalEvent;this.sortable.nativeDraggable?v(document,"dragover",this._handleAutoScroll):this.options.supportPointer?v(document,"pointermove",this._handleFallbackAutoScroll):i.touches?v(document,"touchmove",this._handleFallbackAutoScroll):v(document,"mousemove",this._handleFallbackAutoScroll)},dragOverCompleted:function(t){var i=t.originalEvent;!this.options.dragOverBubble&&!i.rootEl&&this._handleAutoScroll(i)},drop:function(){this.sortable.nativeDraggable?g(document,"dragover",this._handleAutoScroll):(g(document,"pointermove",this._handleFallbackAutoScroll),g(document,"touchmove",this._handleFallbackAutoScroll),g(document,"mousemove",this._handleFallbackAutoScroll)),Rt(),it(),ai()},nulling:function(){st=wt=Oe=St=Pe=gt=vt=null,D.length=0},_handleFallbackAutoScroll:function(t){this._handleAutoScroll(t,!0)},_handleAutoScroll:function(t,i){var o=this,n=(t.touches?t.touches[0]:t).clientX,a=(t.touches?t.touches[0]:t).clientY,s=document.elementFromPoint(n,a);if(st=t,i||this.options.forceAutoScrollFallback||Ve||K||Re){bt(t,this.options,s,i);var l=ie(s,!0);St&&(!Pe||n!==gt||a!==vt)&&(Pe&&Rt(),Pe=setInterval(function(){var d=ie(document.elementFromPoint(n,a),!0);d!==l&&(l=d,it()),bt(t,o.options,d,i)},10),gt=n,vt=a)}else{if(!this.options.bubbleScroll||ie(s,!0)===j()){it();return}bt(t,this.options,ie(s,!1),!1)}}},Y(r,{pluginName:"scroll",initializeByDefault:!0})}function it(){D.forEach(function(r){clearInterval(r.pid)}),D=[]}function Rt(){clearInterval(Pe)}var bt=Vt(function(r,e,t,i){if(e.scroll){var o=(r.touches?r.touches[0]:r).clientX,n=(r.touches?r.touches[0]:r).clientY,a=e.scrollSensitivity,s=e.scrollSpeed,l=j(),d=!1,p;wt!==t&&(wt=t,it(),Oe=e.scroll,p=e.scrollFn,Oe===!0&&(Oe=ie(t,!0)));var u=0,b=Oe;do{var w=b,E=_(w),y=E.top,H=E.bottom,z=E.left,L=E.right,B=E.width,O=E.height,re=void 0,$=void 0,oe=w.scrollWidth,Se=w.scrollHeight,P=h(w),Ie=w.scrollLeft,Q=w.scrollTop;w===l?(re=B<oe&&(P.overflowX==="auto"||P.overflowX==="scroll"||P.overflowX==="visible"),$=O<Se&&(P.overflowY==="auto"||P.overflowY==="scroll"||P.overflowY==="visible")):(re=B<oe&&(P.overflowX==="auto"||P.overflowX==="scroll"),$=O<Se&&(P.overflowY==="auto"||P.overflowY==="scroll"));var xe=re&&(Math.abs(L-o)<=a&&Ie+B<oe)-(Math.abs(z-o)<=a&&!!Ie),q=$&&(Math.abs(H-n)<=a&&Q+O<Se)-(Math.abs(y-n)<=a&&!!Q);if(!D[u])for(var ne=0;ne<=u;ne++)D[ne]||(D[ne]={});(D[u].vx!=xe||D[u].vy!=q||D[u].el!==w)&&(D[u].el=w,D[u].vx=xe,D[u].vy=q,clearInterval(D[u].pid),(xe!=0||q!=0)&&(d=!0,D[u].pid=setInterval(function(){i&&this.layer===0&&f.active._onTouchMove(st);var De=D[this.layer].vy?D[this.layer].vy*s:0,Z=D[this.layer].vx?D[this.layer].vx*s:0;typeof p=="function"&&p.call(f.dragged.parentNode[N],Z,De,r,st,D[this.layer].el)!=="continue"||Wt(D[this.layer].el,Z,De)}.bind({layer:u}),24))),u++}while(e.bubbleScroll&&b!==l&&(b=ie(b,!1)));St=d}},30),Kt=function(e){var t=e.originalEvent,i=e.putSortable,o=e.dragEl,n=e.activeSortable,a=e.dispatchSortableEvent,s=e.hideGhostForTarget,l=e.unhideGhostForTarget;if(t){var d=i||n;s();var p=t.changedTouches&&t.changedTouches.length?t.changedTouches[0]:t,u=document.elementFromPoint(p.clientX,p.clientY);l(),d&&!d.el.contains(u)&&(a("spill"),this.onSpill({dragEl:o,putSortable:i}))}};function Dt(){}Dt.prototype={startIndex:null,dragStart:function(e){var t=e.oldDraggableIndex;this.startIndex=t},onSpill:function(e){var t=e.dragEl,i=e.putSortable;this.sortable.captureAnimationState(),i&&i.captureAnimationState();var o=ge(this.sortable.el,this.startIndex,this.options);o?this.sortable.el.insertBefore(t,o):this.sortable.el.appendChild(t),this.sortable.animateAll(),i&&i.animateAll()},drop:Kt};Y(Dt,{pluginName:"revertOnSpill"});function _t(){}_t.prototype={onSpill:function(e){var t=e.dragEl,i=e.putSortable,o=i||this.sortable;o.captureAnimationState(),t.parentNode&&t.parentNode.removeChild(t),o.animateAll()},drop:Kt};Y(_t,{pluginName:"removeOnSpill"});f.mount(new xi);f.mount(_t,Dt);var Qt=f;var $e=class{constructor(e,t){this.container=e;this.onReorder=t;this.sortable=null}get active(){return this.sortable!==null}enable(){this.sortable||(this.sortable=Qt.create(this.container,{animation:150,forceFallback:!0,ghostClass:"tile--ghost",chosenClass:"tile--chosen",dragClass:"tile--drag",fallbackTolerance:4,onEnd:()=>this.emitOrder()}))}disable(){this.sortable?.destroy(),this.sortable=null}emitOrder(){let e=Array.from(this.container.children).map(t=>t.dataset.id).filter(t=>!!t&&!isNaN(Number(t))).map(t=>parseInt(t,10));this.onReorder(e)}};var je=class r{static createOrUpdate(e,t,i,o=null){let n=o??r.build();return n.dataset.id=e.id.toString(),n.classList.toggle("is-selected",i),n.classList.toggle("is-main",e.isMain),n.classList.toggle("fit-contain",t==="contain"),r.updateImage(n,e,t),n}static build(){let e=document.createElement("div");e.className="tile";let t=document.createElement("img");t.draggable=!1,t.className="tile__img";let i=document.createElement("span");i.className="tile__badge",i.textContent="\u041E\u0431\u043B\u043E\u0436\u043A\u0430";let o=document.createElement("span");return o.className="tile__check",o.innerHTML=T.check(20),e.append(t,i,o),e}static updateImage(e,t,i){let o=e.querySelector("img.tile__img");o.getAttribute("src")!==t.previewUrl&&(o.src=t.previewUrl),o.alt=t.fileName,o.style.objectFit=i}};var Di=300,_i=10,ve=class r extends HTMLElement{constructor(t,i,o){super();this.dispatcher=t;this.previewFit=o;this.mode="normal";this.longPressTimer=null;this.pressStart=null;this.longPressFired=!1;this.style.setProperty("--tile-size",`${i}px`),this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=r.template(),this.grid=this.shadowRoot.querySelector(".grid"),this.reorder=new $e(this.grid,n=>this.emitSort(n)),this.bindEvents()}render(t,i,o){this.applyMode(i);let n=new Map;Array.from(this.grid.children).forEach(a=>{let s=a.dataset.id;s&&n.set(s,a)}),t.forEach(a=>{let s=n.get(a.id.toString())??null,l=je.createOrUpdate(a,this.previewFit,o.has(a.id),s);this.grid.appendChild(l),n.delete(a.id.toString())}),n.forEach(a=>a.remove())}disconnectedCallback(){this.reorder.disable(),this.clearLongPress()}applyMode(t){t!==this.mode&&(this.mode=t,this.grid.classList.remove("grid--normal","grid--selection","grid--reorder"),this.grid.classList.add(`grid--${t}`),t==="reorder"?this.reorder.enable():this.reorder.disable())}bindEvents(){this.grid.addEventListener("click",t=>this.handleClick(t)),this.grid.addEventListener("pointerdown",t=>this.handlePointerDown(t)),this.grid.addEventListener("pointermove",t=>this.handlePointerMove(t)),this.grid.addEventListener("pointerup",()=>this.clearLongPress()),this.grid.addEventListener("pointercancel",()=>this.clearLongPress()),this.grid.addEventListener("contextmenu",t=>{this.mode!=="reorder"&&t.preventDefault()})}handleClick(t){let i=this.tileFrom(t.target);if(!i)return;if(this.longPressFired){this.longPressFired=!1;return}let o=this.tileId(i);o!==null&&(this.mode==="selection"?this.dispatcher.publish("VIEW.TILE_TOGGLE_SELECT",{id:o}):this.mode==="normal"&&this.dispatcher.publish("VIEW.TILE_ACTIVATED",{id:o}))}handlePointerDown(t){if(this.mode!=="normal"||t.pointerType!=="touch")return;let i=this.tileFrom(t.target);if(!i)return;let o=this.tileId(i);o!==null&&(this.pressStart={x:t.clientX,y:t.clientY},this.longPressTimer=setTimeout(()=>{this.longPressFired=!0,navigator.vibrate?.(10),this.dispatcher.publish("VIEW.TILE_LONGPRESS",{id:o}),this.clearLongPress()},Di))}handlePointerMove(t){if(!this.pressStart)return;let i=t.clientX-this.pressStart.x,o=t.clientY-this.pressStart.y;Math.hypot(i,o)>_i&&this.clearLongPress()}clearLongPress(){this.longPressTimer!==null&&(clearTimeout(this.longPressTimer),this.longPressTimer=null),this.pressStart=null}emitSort(t){let i=t.map((o,n)=>({id:o,sort:n}));this.dispatcher.publish("VIEW.SORT_CHANGED",i)}tileFrom(t){return t instanceof Element?t.closest(".tile"):null}tileId(t){let i=t.dataset.id;return i&&!isNaN(Number(i))?parseInt(i,10):null}static template(){return`
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
        `}};customElements.define("image-grid",ve);var be=class r extends HTMLElement{constructor(t,i,o){super();this.dispatcher=t;this.previewFit=o;this.style.setProperty("--tile-size",`${i}px`),this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=r.template(),this.grid=this.shadowRoot.querySelector(".queue"),this.label=this.shadowRoot.querySelector(".label")}render(t){this.label.classList.toggle("visible",t.length>0);let i=new Map;Array.from(this.grid.children).forEach(o=>{let n=o.dataset.id;n&&i.set(n,o)}),t.forEach((o,n)=>{let a=i.get(o.id.toString())??null,s=this.createOrUpdate(o,a);a||this.grid.insertBefore(s,this.grid.children[n]||null),i.delete(o.id.toString())}),i.forEach(o=>this.removeItem(o))}createOrUpdate(t,i){let o=i??this.build(t);o.dataset.id=t.id.toString(),o.classList.toggle("is-failed",t.status==="failed"),o.classList.toggle("is-uploading",t.status==="uploading"||t.status==="pending");let n=o.querySelector(".q-status");return t.status==="failed"?n.textContent=t.error?`\u041E\u0448\u0438\u0431\u043A\u0430: ${t.error}`:"\u041E\u0448\u0438\u0431\u043A\u0430":t.status==="uploading"?n.textContent=`${t.progress}%`:n.textContent="",o}build(t){let i=document.createElement("div");i.className="q-item";let o=document.createElement("img");o.className="q-img",o.draggable=!1;let n=URL.createObjectURL(t.file);o.src=n,o.alt=t.file.name,o.style.objectFit=this.previewFit,i.dataset.objectUrl=n;let a=document.createElement("button");a.type="button",a.className="q-del",a.title="\u0423\u0431\u0440\u0430\u0442\u044C \u0438\u0437 \u043E\u0447\u0435\u0440\u0435\u0434\u0438",a.innerHTML=T.close(13),a.addEventListener("click",l=>{l.preventDefault(),this.dispatcher.publish("VIEW.IMAGE_DELETED",{type:"upload",id:t.id})});let s=document.createElement("div");return s.className="q-status",i.append(o,a,s),i}removeItem(t){let i=t.dataset.objectUrl;i&&URL.revokeObjectURL(i),t.remove()}static template(){return`
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
        `}};customElements.define("upload-queue",be);var Ti=[{id:"set-main",label:"\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u043E\u0439",icon:T.star(15),placement:["bulk-toolbar"],bulk:!1,enabled:r=>r.selectedIds.length===1,run:(r,e)=>e.publish("VIEW.SET_MAIN_IMAGE",{id:r[0]})},{id:"delete",label:"\u0423\u0434\u0430\u043B\u0438\u0442\u044C",icon:T.trash(15),placement:["bulk-toolbar","inspector"],bulk:!0,enabled:r=>r.selectedIds.length>0,run:(r,e)=>e.publish("VIEW.IMAGES_DELETED",{ids:r})}];function dt(r){return Ti.filter(e=>e.placement.includes(r))}var Ee=class extends HTMLElement{constructor(t){super();this.dispatcher=t;this.actions=dt("bulk-toolbar");this.actionButtons=new Map;this.selection=[];this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=this.template(),this.countEl=this.shadowRoot.querySelector(".js-count"),this.buildActionButtons(),this.bindStatic(),this.style.display="none"}update(t,i){let o=[...t];this.selection=o,this.countEl.textContent=`\u0412\u044B\u0431\u0440\u0430\u043D\u043E: ${o.length}`;let n={images:i,selectedIds:o};this.actions.forEach(a=>{let s=this.actionButtons.get(a.id);s.disabled=a.enabled?!a.enabled(n):o.length===0})}setVisible(t){this.style.display=t?"block":"none"}buildActionButtons(){let t=this.shadowRoot.querySelector(".js-actions");this.actions.forEach(i=>{let o=this.makeButton(i);this.actionButtons.set(i.id,o),t.appendChild(o)})}makeButton(t){let i=document.createElement("button");return i.type="button",i.className=t.id==="delete"?"btn btn--danger":"btn",i.innerHTML=`${t.icon}<span>${t.label}</span>`,i.addEventListener("click",o=>{o.preventDefault(),!i.disabled&&t.run(this.selection.slice(),this.dispatcher)}),i}bindStatic(){this.shadowRoot.querySelector(".js-select-all").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.SELECT_ALL")}),this.shadowRoot.querySelector(".js-cancel").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.EXIT_MODE")})}template(){return`
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
                <button type="button" class="btn btn--ghost js-select-all">${T.select(15)} \u0412\u044B\u0431\u0440\u0430\u0442\u044C \u0432\u0441\u0451</button>
                <span class="spacer"></span>
                <span class="js-actions" style="display:inline-flex; gap:8px;"></span>
                <button type="button" class="btn btn--ghost js-cancel">${T.close(15)} \u041E\u0442\u043C\u0435\u043D\u0430</button>
            </div>
        `}};customElements.define("bulk-action-bar",Ee);var ye=class extends HTMLElement{constructor(t,i){super();this.dispatcher=t;this.previewFit=i;this.deleteActions=dt("inspector");this.current=null;this.attachShadow({mode:"open"}),this.shadowRoot.innerHTML=this.template(),this.imgEl=this.shadowRoot.querySelector(".js-preview"),this.nameEl=this.shadowRoot.querySelector(".js-name"),this.coverBtn=this.shadowRoot.querySelector(".js-cover"),this.actionsSlot=this.shadowRoot.querySelector(".js-actions"),this.buildActions(),this.bind(),this.style.display="none"}update(t){if(this.current=t,!t){this.close();return}this.imgEl.src=t.previewUrl,this.imgEl.alt=t.fileName,this.imgEl.style.objectFit=this.previewFit,this.nameEl.textContent=t.fileName,this.renderCoverRole(t.isMain),this.open()}renderCoverRole(t){this.coverBtn.classList.toggle("role--active",t),this.coverBtn.disabled=t,this.coverBtn.innerHTML=t?`${T.star(15)}<span>\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u043E\u0431\u043B\u043E\u0436\u043A\u0430</span>`:`${T.star(15)}<span>\u0421\u0434\u0435\u043B\u0430\u0442\u044C \u043E\u0431\u043B\u043E\u0436\u043A\u043E\u0439</span>`}buildActions(){this.deleteActions.forEach(t=>{let i=document.createElement("button");i.type="button",i.className=t.id==="delete"?"btn btn--danger":"btn",i.innerHTML=`${t.icon}<span>${t.label}</span>`,i.addEventListener("click",o=>{o.preventDefault(),this.current&&t.run([this.current.id],this.dispatcher)}),this.actionsSlot.appendChild(i)})}bind(){this.coverBtn.addEventListener("click",t=>{t.preventDefault(),this.current&&!this.current.isMain&&this.dispatcher.publish("VIEW.SET_MAIN_IMAGE",{id:this.current.id})}),this.shadowRoot.querySelector(".js-close").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.CLOSE_INSPECTOR")}),this.shadowRoot.querySelector(".js-backdrop").addEventListener("click",t=>{t.preventDefault(),this.dispatcher.publish("VIEW.CLOSE_INSPECTOR")})}open(){this.style.display="block",this.offsetWidth,this.shadowRoot.querySelector(".sheet").classList.add("sheet--open"),this.shadowRoot.querySelector(".js-backdrop").classList.add("backdrop--open")}close(){let t=this.shadowRoot.querySelector(".sheet"),i=this.shadowRoot.querySelector(".js-backdrop");t.classList.remove("sheet--open"),i.classList.remove("backdrop--open"),setTimeout(()=>{this.current||(this.style.display="none")},220)}template(){return`
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
                    <button type="button" class="icon-btn js-close" aria-label="\u0417\u0430\u043A\u0440\u044B\u0442\u044C">${T.close(18)}</button>
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
        `}};customElements.define("inspector-panel",ye);var we=class extends HTMLElement{constructor(){super();this.container=null;this.iconEl=null;this.titleEl=null;this.subtitleEl=null;this.attachShadow({mode:"open"}),this.build()}build(){let t=document.createElement("style");t.textContent=`
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
        `,this.container=document.createElement("div"),this.container.className="preloader";let i=document.createElement("div");i.className="icon-wrap",this.iconEl=i,this.titleEl=document.createElement("p"),this.titleEl.className="title",this.subtitleEl=document.createElement("p"),this.subtitleEl.className="subtitle",this.container.appendChild(i),this.container.appendChild(this.titleEl),this.container.appendChild(this.subtitleEl),this.shadowRoot.appendChild(t),this.shadowRoot.appendChild(this.container)}show(t="loading",i){this.applyMode(t,i),this.container.classList.add("visible")}updateProgress(t){this.subtitleEl&&(this.subtitleEl.textContent=`${Math.round(t)}%`)}setSubtitle(t){this.subtitleEl&&(this.subtitleEl.textContent=t)}hide(){this.container.classList.remove("visible")}applyMode(t,i){if(!(!this.iconEl||!this.titleEl||!this.subtitleEl)){if(this.iconEl.innerHTML="",t==="loading"){let o=document.createElement("div");o.className="spinner",this.iconEl.appendChild(o),this.titleEl.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",this.subtitleEl.textContent=""}else if(t==="delete"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("viewBox","0 0 16 16"),o.setAttribute("fill","currentColor"),o.classList.add("icon-delete"),o.innerHTML='<path d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"/>',this.iconEl.appendChild(o),this.titleEl.textContent="\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435...",this.subtitleEl.textContent=""}else if(t==="upload"){let o=document.createElementNS("http://www.w3.org/2000/svg","svg");o.setAttribute("viewBox","0 0 16 16"),o.setAttribute("fill","currentColor"),o.classList.add("icon-upload"),o.innerHTML='<path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/><path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708z"/>',this.iconEl.appendChild(o),this.titleEl.textContent="\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430...",this.subtitleEl.textContent=i!==void 0?`${Math.round(i)}%`:""}}}};customElements.define("preloader-wc",we);var Ge=class{constructor(){this.hideTimer=null;let e=document.createElement("style");e.textContent=`
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
        `,document.head.appendChild(e),this.bar=document.createElement("div"),this.bar.className="top-progress-bar",this.inner=document.createElement("div"),this.inner.className="top-progress-bar-inner",this.bar.appendChild(this.inner),document.body.appendChild(this.bar)}setProgress(e){this.cancelHideTimer(),this.inner.classList.remove("indeterminate"),this.bar.style.display="block",this.inner.style.width=`${Math.max(0,Math.min(100,e))}%`}setIndeterminate(){this.cancelHideTimer(),this.bar.style.display="block",this.inner.classList.add("indeterminate")}complete(){this.cancelHideTimer(),this.inner.classList.remove("indeterminate"),this.inner.style.width="100%",this.hideTimer=setTimeout(()=>{this.bar.style.display="none",this.inner.style.width="0%"},400)}cancelHideTimer(){this.hideTimer!==null&&(clearTimeout(this.hideTimer),this.hideTimer=null)}};var ze=class{constructor(e,t,i,o="cover"){this.dispatcher=t;this.topBarActive=!1;this.wasUploading=!1;this.container=document.getElementById(e),this.container.innerHTML="",this.applyContainerStyles();let n=100*i;this.topBar=new Ge,this.toolbar=new ce(this.dispatcher),this.bulkBar=new Ee(this.dispatcher),this.grid=new ve(this.dispatcher,n,o),this.queue=new be(this.dispatcher,n,o),this.inspector=new ye(this.dispatcher,o),this.preloader=new we;let a=new ke(this.dispatcher),s=new de(this.dispatcher),l=document.createElement("div");l.className="gu-upload-section",l.append(s,this.queue,a),this.container.append(this.toolbar,this.bulkBar,this.grid,l,this.preloader,this.inspector),this.bindGlobalKeys()}render(e){this.toolbar.update(e.uiMode,e.serverImages.length),this.grid.render(e.serverImages,e.uiMode,e.selectedIds),this.queue.render(e.uploadImages);let t=e.uiMode==="selection";this.bulkBar.setVisible(t),t&&this.bulkBar.update(e.selectedIds,e.serverImages),this.inspector.update(e.inspectorImage),e.isUploading?(this.wasUploading=!0,this.preloader.show("upload",e.overallProgress),this.preloader.setSubtitle(`${e.uploadDoneCount} \u0438\u0437 ${e.uploadTotalCount}`),this.topBar.setProgress(e.overallProgress)):(this.preloader.hide(),(this.wasUploading||this.topBarActive)&&(this.topBar.complete(),this.wasUploading=!1,this.topBarActive=!1))}preloaderAction(e,t="loading",i="indeterminate"){e==="start"?(this.preloader.show(t),i==="determinate"?this.topBar.setProgress(0):this.topBar.setIndeterminate(),this.topBarActive=!0):this.preloader.hide()}busyProgress(e,t){this.topBar.setProgress(e),this.topBarActive=!0,t!==void 0&&this.preloader.setSubtitle(t)}topBarAction(e){e==="indeterminate"?(this.topBar.setIndeterminate(),this.topBarActive=!0):(this.topBar.complete(),this.topBarActive=!1)}bindGlobalKeys(){document.addEventListener("keydown",e=>{e.key==="Escape"&&(this.inspector.style.display!=="none"?this.dispatcher.publish("VIEW.CLOSE_INSPECTOR"):this.dispatcher.publish("VIEW.EXIT_MODE"))})}applyContainerStyles(){let e=document.createElement("style");e.textContent=`
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
        `,document.head.appendChild(e)}};function wr(r){let e=new Te,t=new Le(r.maxWidth||1920,r.maxHeight||1080),i=new Ae(r.headers,r.endpoints,r.ownerId,r.formNames),o=new Ce(r.endpoints.upload,r.headers,t,e,r.ownerId,r.formNames.uploadImageForm,3),n=new ze(r.containerId,e,r.imageScale||1,r.previewFit||"cover");new Me(t,n,i,o,e).init()}export{wr as createGalleryWidget};
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
