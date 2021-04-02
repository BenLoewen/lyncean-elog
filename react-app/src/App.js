import React, { useState, setShow, useEffect } from 'react';
import ReactDOM, { render } from 'react-dom'
import './App.css';
import {useDropzone} from 'react-dropzone';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button'
import Alert from 'react-bootstrap/Button'
import Card from 'react-bootstrap/Card'
import InputGroup from 'react-bootstrap/InputGroup'
import FormControl from 'react-bootstrap/FormControl'
import Container from 'react-bootstrap/Container'
import Col from 'react-bootstrap/Col'
import Row from 'react-bootstrap/Row'
import Form from 'react-bootstrap/Form'
import Nav from 'react-bootstrap/Nav'
import Navbar from 'react-bootstrap/Navbar'
import Table from 'react-bootstrap/Table'
import Modal from 'react-bootstrap/Modal'
import 'bootstrap/dist/css/bootstrap.min.css';
import ListGroup from 'react-bootstrap/ListGroup'
import ListGroupItem from 'react-bootstrap/ListGroupItem'
import $ from "jquery";
import DropdownButton from 'react-bootstrap/DropdownButton'
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

let buttonId = 0
let iter = 0
let last=-1
let files = [[],[]]
let shownFiles = [[],[]]
let uploadedImages = [[],[]]
let uploadedFiles = [[],[]]
const list_of_logs = ["Electronics","Operations"]
let lastUrl = ""
let lastLastUrl = ""
let query = ""
let prev_query = ""
let currentLog = ""
let rootUrl = ""
let appendingToPost = false
let enteringTestConfig = false
let focus = false
let prev_view = ""
let prev_log = ""
let prev_config = ""

let glob_user = "operator"
let glob_tags = {"electronics":["MUX","MtrCntrl","Sync","InjLsFdbk","PwrMtr","LLRF","RFPPA","VacRad","SbandAmp","UniPolar","BiPolar","BPM","TSDG", "Magnets", "Mod","None"],"operations":["Gun Test","Load Test","Structure Test","Module Test","None"]}


function App() {
  let endOfUrl = window.location.href.indexOf("#")
  let currUrl = window.location.href.slice(endOfUrl)

  let q = currUrl.indexOf("?")
  if(q==-1){
    q = currUrl.length
  }
  query = currUrl.slice(q+1)
  prev_query = query
  rootUrl = currUrl.slice(0,q)

  lastUrl = currUrl
  lastLastUrl = lastUrl;

  //Set user based on cookies
  glob_user = getCookie("username")
  if(glob_user==""){
    glob_user="operator"
  }

  if(currUrl.indexOf("#/write-to/")==0){
    let log_ind = currUrl.indexOf('-log')
    currentLog = currUrl.slice(11,log_ind)
    return(<AddLogEntry log={currentLog}/>);
  }
  else if(currUrl.indexOf("#/search-configurations")==0){
    return(<SearchLogs/>);
  }
  else if(currUrl.indexOf("#/view/log")==0){
    return(<ViewLog/>);
  }
  else if(currUrl.indexOf("#/view-logs")==0){
    return(<LogSelector path={"Start"}/>)
  }
  else if(currUrl.indexOf("#/search-entries")==0){
    return(<SearchLogs log={"all"} config={""}/>)
  }
  else{
    console.log(currUrl)
    window.location.href = "#/write-to/electronics-log"
    window.location.reload(false);
  }
}

function tick(){
  let endOfUrl = window.location.href.indexOf("#")
  let currUrl = window.location.href.slice(endOfUrl)

  let q = currUrl.indexOf("?")
  if(q==-1){
    q = currUrl.length
  }
  prev_query = query
  query = currUrl.slice(q+1)
  rootUrl = currUrl.slice(0,q)

  if(!focus && currUrl.indexOf("#/write-to/")==0){
    $("#enter-comment").trigger('focus')
    focus = true
  }

  if(lastUrl!=currUrl){
    if(appendingToPost){
      appendingToPost=false
    }
    const element = <h1>Page Not Found!</h1>;
    if(currUrl.indexOf("#/write-to/")==0){
      let log_ind = currUrl.indexOf('-log')
      currentLog = currUrl.slice(11,log_ind)
      ReactDOM.render(<AddLogEntry log={currentLog}/>, document.getElementById('root'));
      $("#enter-comment").trigger('focus')
      if(prev_query!=query){
        ReactDOM.render(<TagDropdownBox/>, document.getElementById('tag-selection'));
      }
    }
    else if(currUrl.indexOf("#/search-configurations")==0){
      if(lastLastUrl.indexOf("#/search-configurations")==0){
        ReactDOM.render(<SearchLogs log={prev_log} config={prev_config}/>, document.getElementById('root'));
        searchLogs(prev_log,prev_config)
      }else{
        ReactDOM.render(<SearchLogs log={"all"} config={""}/>, document.getElementById('root'));
      }
    }
    else if(currUrl.indexOf("#/view/log")==0){
      ReactDOM.render(<ViewLog/>, document.getElementById('root'));
      //if(prev_query!=query){
      //  window.location.reload(false);
      //}
    }
    else if(currUrl.indexOf("#/view-logs")==0){
      if(lastLastUrl.indexOf("#/view-logs")==0){
        ReactDOM.render(<LogSelector path={prev_view}/>, document.getElementById('root'));
      }else{
        ReactDOM.render(<LogSelector path={"Start"}/>, document.getElementById('root'));
      }
    }
    else if(currUrl.indexOf("#/search-entries")==0){
      ReactDOM.render(<SearchEntries/>, document.getElementById('root'))
      if(prev_query!=query){

      }
    }
    else{
      ReactDOM.render(element, document.getElementById('root'));
      //window.location.reload(false);
    }
    lastLastUrl = lastUrl;
    lastUrl = currUrl;
  }

  //if(currUrl.indexOf("#/write-to/")==0){
  //  $("#enter-comment").focus()
  //}
}

setInterval(tick, 100);

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays*24*60*60*1000));
  var expires = "expires="+ d.toUTCString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}

function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i <ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
}

function SearchEntries(props){
  return(<div className="App">
          <Container>
            <ElogNavbar/>
            <Row id="push">
              <Col xs={4}>
                <Row>
                  <div class="spaced-out">
                    <SelectTag log={"all"} toggle={"All"}/>
                  </div>
                </Row>
              </Col>
              <Col xs={4}>
                <Row>
                  <div class="spaced-out">
                    <SelectStartDate/>
                  </div>
                </Row>
                <Row>
                  <EnterKeyword/>
                </Row>
              </Col>
              <Col xs={4}>
                <Row>
                  <div class="spaced-out">
                    <SelectEndDate/>
                  </div>
                </Row>
                <Row>
                  <div class="spaced-out">
                    <SearchEntryButton/>
                  </div>
                </Row>
              </Col>
            </Row>
            <Row>
              <div id="results-title">
                Results
              </div>
            </Row>
            <Row>
              <Container id="results">

              </Container>
            </Row>
          </Container>
        </div>);
}

class LogSelector extends React.Component{
  constructor(props){
    super(props)
    prev_view = props.path
    this.state = {paths:{},curr:props.path}
    this.getOptions = this.getOptions.bind(this);
  }

  async componentDidMount(){
    let dates = {}
    await $.ajax({
      type: "GET",
      url: "/fetch_dates",
      dataType : "json",
      async: false,
      contentType: "application/json; charset=utf-8",
      success: function(result){
          dates = result["dates"]
      },
      error: function(request, status, error){
          console.log("Error");
          console.log(request)
          console.log(status)
          console.log(error)
      }
    })
    this.setState({paths:dates})
  }

  getOptions(){
    let options = []
    let curr = this.state.curr
    let split =  this.state.curr.split("/")
    if(split.length<4){
      if(!(curr in this.state.paths))return []
      let poss = this.state.paths[curr]
      for(let i=0;i<poss.length;i++){
        let opt = poss[i]
        let split = opt.split("/")
        let last = split[split.length-1]
        options.push(<Button variant="primary" onClick={()=>this.setCurr(opt)} size="lg" block>{last}</Button>)
      }
    }else{
      console.log(this.state.curr)
      searchLogsAtDate(this.state.curr)
    }
    return options
  }

  setCurr(newCurr){
    prev_view = newCurr
    this.setState({curr:newCurr})
  }

  goBack(){
    let split =  this.state.curr.split("/")
    let newCurr = split.slice(0, split.length - 1).join("/")
    this.setState({curr:newCurr})
    ReactDOM.render(<div></div>,document.getElementById("results"))
  }

  getLevel(){
    let level =  this.state.curr.split("/").length
    if(level==1) return "Choose Year"
    if(level==2) return "Choose Month"
    if(level==3) return "Choose Day"
    return "Choose Log"
  }


  render(){
    console.log(this.state)
    let options = this.getOptions()
    let level = this.getLevel()
    return(<div className="App">
            <Container>
              <ElogNavbar/>
              <Button variant="secondary" disabled={this.state.curr==="Start"} onClick={()=>this.goBack()} id="back">Back</Button>
              <div id="level">{level}</div>
              <>
                {options}
              </>
              <Container id="results">
              </Container>
            </Container>
          </div>);
  }
}

class SearchLogs extends React.Component{
  constructor(props){
    super(props)
    this.state = {log:props.log,config:props.config}
  }

  render(){
    return (
      <div className="App">
        <Container>
          <ElogNavbar/>
          <Row id="push">
            <Col xs={2}>
                <div class="spaced-out">
                  <SelectLog log={this.state.log}/>
                </div>
            </Col>
            <Col xs={3}>
              <div class="spaced-out">
                <EnterConfig config={this.state.config}/>
              </div>
            </Col>
            <Col xs={2}>
             <SearchLogButton/>
            </Col>
            <Col xs={5}/>
          </Row>
          <Row>
            <div id="results-title">
              Results
            </div>
          </Row>
          <Row>
            <Container id="results">

            </Container>
          </Row>
        </Container>
      </div>
    );
  }
}

function EnterKeyword(props){
  return(<div id="keyword">
    <div id="enter-keyword">
      Keyword
    </div>
    <Form>
      <Form.Group controlId="formKeyword">
        <Form.Control id="keyword" />
      </Form.Group>
    </Form>
   </div>);
}

function SearchEntryButton(props){
  function submit(){
    let keyword = $("#keyword").val()
    let query_parts = query.split(",")
    let now = new Date();
    let end_date = now.toISOString().slice(0,10);
    now.setDate(1)
    let start_date = now.toISOString().slice(0,10)
    let tag = "all"
    let log = "all"
    for(var i=0; i<query_parts.length; i++){
      let part = query_parts[i].split("=")
      if(part[0]=="start"){
        start_date = part[1]
      }
      else if(part[0]=="end"){
        end_date = part[1]
      }
      else if(part[0]=="log"){
        log = part[1]
      }
      else if(part[0]=="tag"){
        tag = part[1].replace("_"," ")
      }
    }
    searchEntries(start_date,end_date,log,tag,keyword)
  }

  return(<Button id="search-entry-button" variant="primary" onClick={() => submit()}>
          Search
         </Button>);
}

async function searchEntries(start_date, end_date, log, tag, keyword){
  let searchQuery = {"start_date":start_date,"end_date":end_date,"log":log,"tag":tag,"keyword":keyword}
  let ids = []

  $.ajax({
    type: "POST",
    url: "/search_entries",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(searchQuery),
    success: function(result){
        ids = result["results"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })

  let entriesQuery = {"ids":ids,"this":123}
  let entries = []
  $.ajax({
    type: "POST",
    url: "/get_entries_from_ids",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(entriesQuery),
    success: function(result){
        entries = result["entries"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })
  console.log(entries)

  ReactDOM.render(<UnappendableEntries entries={entries}/>, document.getElementById("results"))
}

function EnterConfig(props){
  return(<div>
          <div id="enter-config">
            Configuration Name
          </div>
          <Form>
            <Form.Group controlId="formConfigName">
              <Form.Control defaultValue={props.config} id="configName" />
            </Form.Group>
          </Form>
         </div>);
}

function SearchLogButton(props){

  function submit(){
    let config_name = $("#configName").val()
    prev_config = config_name
    let query_parts = query.split(",")
    let log = "all"
    for(var i=0; i<query_parts.length; i++){
      let part = query_parts[i].split("=")
      if(part[0]=="log"){
        log = part[1]
      }
    }
    prev_log = log
    searchLogs(log,config_name)
  }

  return(<Button id="search-log-button" variant="primary" onClick={() => submit()}>
          Search
         </Button>);

}

async function searchLogsAtDate(date){

  let searchQuery = {"date":date}
  let ids = []

  $.ajax({
    type: "POST",
    url: "/logs_at_date",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(searchQuery),
    success: function(result){
        ids = result["results"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })


  let items = []
  let data = {}

  for(let i=0;i<ids.length;i++){
    let thisId = ids[i]
    $.ajax({
      type: "GET",
      url: "/get_log/" + thisId,
      dataType : "json",
      async: false,
      contentType: "application/json; charset=utf-8",
      //data : JSON.stringify(thisId),
      success: function(result){
          data = result["data"]
      },
      error: function(request, status, error){
          console.log("Error");
          console.log(request)
          console.log(status)
          console.log(error)
      }
    })

    console.log(data)

    let text = testingConfigToTable(data["operator"],data["configname"],[],[],false)
    let title = data["title"]
    let id = ids[i]
    let updated = data["timestop"]

    items.push(<LogCard text={text} title={title} id={id} updated={updated}/>);
  }

  let logCards = []
  for(let i=0; i<items.length;i+=3){
    let item_set = []
    item_set.push(items[i])
    item_set.push(items[i+1])
    item_set.push(items[i+2])
    logCards.push(<Row>{item_set}</Row>)
  }

  ReactDOM.render(<div class="card-deck">{logCards}</div>,document.getElementById("results"))

}


async function searchLogs(log, config_name){
  let searchQuery = {"log":log,"config_name":config_name}
  let ids = []

  $.ajax({
    type: "POST",
    url: "/search_logs",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(searchQuery),
    success: function(result){
        ids = result["results"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })


  let items = []
  let data = {}

  for(let i=0;i<ids.length;i++){
    let thisId = ids[i]
    $.ajax({
      type: "GET",
      url: "/get_log/" + thisId,
      dataType : "json",
      async: false,
      contentType: "application/json; charset=utf-8",
      //data : JSON.stringify(thisId),
      success: function(result){
          data = result["data"]
      },
      error: function(request, status, error){
          console.log("Error");
          console.log(request)
          console.log(status)
          console.log(error)
      }
    })

    console.log(data)

    let text = testingConfigToTable(data["operator"],data["configname"],[],[],false)
    let title = data["title"]
    let id = ids[i]
    let updated = data["timestop"]

    items.push(<LogCard text={text} title={title} id={id} updated={updated}/>);
  }

  let logCards = []
  for(let i=0; i<items.length;i+=3){
    let item_set = []
    item_set.push(items[i])
    item_set.push(items[i+1])
    item_set.push(items[i+2])
    logCards.push(<Row>{item_set}</Row>)
  }

  ReactDOM.render(<div class="card-deck">{logCards}</div>,document.getElementById("results"))

}


const SelectStartDate = () => {
  var ourDate = new Date();
  ourDate.setDate(1)
  const [startDate, setStartDate] = useState(ourDate);

  let changeDate= function(date){
    setStartDate(date)
    let strDate = date.toISOString().slice(0,10);
    let new_query=query.split(",")
    if(query.length===0){
      new_query = []
    }
    console.log(new_query)
    let start_date_in_query = false
    for(var i=0; i<new_query.length;i++){
      let part = new_query[i].split("=")
      if(part[0]==="start"){
        new_query[i] = "start=" + strDate
        start_date_in_query = true
      }
    }
    if(!start_date_in_query){
      new_query.push("start=" + strDate)
    }
    window.location.href = rootUrl + "?" + new_query.join(",")
  }

  return (
    <div class="margin-top">
      <Row>
      <div class="date">Start Date</div>
      </Row>
      <div class="date-selector">
        <DatePicker selected={startDate} onChange={date => changeDate(date)} />
      </div>
    </div>
  );
};

const SelectEndDate = () => {
  const [startDate, setStartDate] = useState(new Date());

  let changeDate= function(date){
    setStartDate(date)
    let strDate = date.toISOString().slice(0,10);
    let new_query=query.split(",")
    if(query.length===0){
      new_query = []
    }
    console.log(new_query)
    let end_date_in_query = false
    for(var i=0; i<new_query.length;i++){
      let part = new_query[i].split("=")
      if(part[0]==="end"){
        new_query[i] = "end=" + strDate
        end_date_in_query = true
      }
    }
    if(!end_date_in_query){
      new_query.push("end=" + strDate)
    }
    window.location.href = rootUrl + "?" + new_query.join(",")
  }

  return (
    <div class="margin-top">
      <Row>
        <div class="date">End Date</div>
      </Row>
      <div class="date-selector">
        <DatePicker selected={startDate} onChange={date => changeDate(date)} />
      </div>
    </div>
  );
};

class SelectTag extends React.Component{
  constructor(props){
    super(props)
    let tag_toggle = "All"
    let tag_menu = []

    let log_toggle = "All"
    let log_menu = []

    let tags = {}

    $.ajax({
      type: "GET",
      url: "/fetch_tags",
      dataType : "json",
      async: false,
      contentType: "application/json; charset=utf-8",
      success: function(result){
          tags = result["tags"]
      },
      error: function(request, status, error){
          console.log("Error");
          console.log(request)
          console.log(status)
          console.log(error)
      }
    })

    this.tags = tags
    //CHECK QUERY ARGS
    let split_query = query.split(",")
    let query_arg = ''
    for(query_arg of split_query){
      let arg = query_arg.split("=")
      let name = arg[0]
      let val = arg[1]
      if(name==="log"){
        log_toggle = val.charAt(0).toUpperCase() + val.slice(1)

        tag_toggle = "All"
        tag_menu = []
        if(val!=="All"){
          let tag = ''
          for(tag of this.tags[val]){
            let tag_key = tag.replace(" ","_")
            tag_menu.push(<Dropdown.Item eventKey={tag_key}>{tag}</Dropdown.Item>)
          }
          tag_menu.push(<Dropdown.Item eventKey={"all"}>{"All"}</Dropdown.Item>)
        }
      }
    }

    var log_opt = ''
    for(log_opt of list_of_logs){
      let eventKey = log_opt.charAt(0).toLowerCase() + log_opt.slice(1);
      let name = log_opt.charAt(0).toUpperCase() + log_opt.slice(1);
      log_menu.push(<Dropdown.Item eventKey={eventKey}>{name}</Dropdown.Item>)
    }
    log_menu.push(<Dropdown.Item eventKey={"all"}>{"All"}</Dropdown.Item>)
    this.handleLogSelect = this.handleLogSelect.bind(this)
    this.handleTagSelect = this.handleTagSelect.bind(this)


    this.state = {log_toggle:log_toggle,log_menu:log_menu,tag_toggle:tag_toggle,tag_menu:tag_menu}
  }

  handleLogSelect(key){
    let new_query=query.split(",")
    if(query.length===0){
      new_query = []
    }
    let log_in_query = false
    for(var i=0; i<new_query.length;i++){
      let part = new_query[i].split("=")
      if(part[0]==="log"){
        new_query[i] = "log=" + key
        log_in_query = true
      }
      if(part[0]=="tag"){
        new_query = new_query.slice(0,i).concat(new_query.slice(i+1))
        i += -1
      }
    }
    if(!log_in_query){
      new_query.push("log=" + key)
    }
    window.location.href = rootUrl + "?" + new_query.join(",")
    let newToggle = key.charAt(0).toUpperCase() + key.slice(1)
    //Update tag menu
    let tag_toggle = "All"
    let tag_menu = []
    if(key!=="all"){
      let tag = ''
      for(tag of this.tags[key]){
        let tag_key = tag.replace(" ","_")
        tag_menu.push(<Dropdown.Item eventKey={tag_key}>{tag}</Dropdown.Item>)
      }
      tag_menu.push(<Dropdown.Item eventKey={"all"}>{"All"}</Dropdown.Item>)
    }
    console.log(key)
    this.setState({log_toggle:newToggle,log_menu:this.state.log_menu,tag_toggle:tag_toggle,tag_menu:tag_menu})
  }

  handleTagSelect(key){
    let new_query=query.split(",")
    if(query.length===0){
      new_query = []
    }
    let tag_in_query = false
    for(var i=0; i<new_query.length;i++){
      let part = new_query[i].split("=")
      if(part[0]==="tag"){
        new_query[i] = "tag=" + key
        tag_in_query = true
      }
    }
    if(!tag_in_query){
      new_query.push("tag=" + key)
    }
    window.location.href = rootUrl + "?" + new_query.join(",")
    let newToggle = key.replace("_"," ")
    newToggle = newToggle.charAt(0).toUpperCase() + newToggle.slice(1)
    this.setState({log_toggle:this.state.log_toggle,log_menu:this.state.log_menu,tag_toggle:newToggle,tag_menu:this.state.tag_menu})
  }

  render(){
    return(<Container>
            <Row>
              <Container>
                <Row>
                  <div id='select-log'>Log</div>
                </Row>
                <Dropdown id="dropdown-left" onSelect={this.handleLogSelect}>
                  <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                    {this.state.log_toggle}
                  </Dropdown.Toggle>

                  <Dropdown.Menu>
                    {this.state.log_menu}
                  </Dropdown.Menu>
                </Dropdown>
              </Container>
            </Row>
            <Row>
              <Container>
                <Row>
                  <div id='select-tag'>Tag</div>
                </Row>
                <Dropdown id="dropdown-left" onSelect={this.handleTagSelect}>
                  <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                    {this.state.tag_toggle}
                  </Dropdown.Toggle>

                  <Dropdown.Menu>
                    {this.state.tag_menu}
                  </Dropdown.Menu>
                </Dropdown>
              </Container>
            </Row>
          </Container>);
  }
}

class SelectLog extends React.Component{
  constructor(props){
    super(props)
    let toggle = props.log.charAt(0).toUpperCase() + props.log.slice(1)
    let menu = []

    var log_opt = ''
    for(log_opt of list_of_logs){
      let eventKey = log_opt.charAt(0).toLowerCase() + log_opt.slice(1);
      let name = log_opt.charAt(0).toUpperCase() + log_opt.slice(1);
      menu.push(<Dropdown.Item eventKey={eventKey}>{name}</Dropdown.Item>)
    }
    menu.push(<Dropdown.Item eventKey={"all"}>{"All Logs"}</Dropdown.Item>)
    this.handleSelect = this.handleSelect.bind(this)

    let split_query = query.split(",")
    for(var i=0; i<split_query.length;i++){
      let part = split_query[i].split("=")
      console.log(part)
      console.log(part[0]=="log")
      console.log(part[0]==='log')
      if(part[0]==="log"){
        toggle = part[1].charAt(0).toUpperCase() + part[1].slice(1)
      }
    }

    this.state = {toggle:toggle,menu:menu}

  }

  handleSelect(key){
    let new_query=query.split(",")
    if(query.length===0){
      new_query = []
    }
    let log_in_query = false
    for(var i=0; i<new_query.length;i++){
      let part = new_query[i].split("=")
      if(part[0]==="log"){
        new_query[i] = "log=" + key
        log_in_query = true
      }
    }
    if(!log_in_query){
      new_query.push("log=" + key)
    }
    window.location.href = rootUrl + "?" + new_query.join(",")
    let newToggle = key.charAt(0).toUpperCase() + key.slice(1)
    this.setState({toggle:newToggle,menu:this.state.menu})
  }

  render(){
    return(<div>
            <Row>
              <div id='select-log'>Select Log</div>
            </Row>
            <Dropdown id="dropdown-left" onSelect={this.handleSelect}>
              <Dropdown.Toggle variant="secondary" id="dropdown-basic">
                {this.state.toggle}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                {this.state.menu}
              </Dropdown.Menu>
            </Dropdown>
          </div>);
  }
}



function Post(props){
    let images = []
    let files = []
    let comments = []
    let tags = []
    for(let i=0;i<props.images.length;i++){
      let img = props.images[i]
      let imgName = img[0]
      let imgData = img[1]
      images.push(<img src={"data:image/png;base64," + imgData} alt={imgName} width="800px" height="auto"/>)
      //images.push(<img src={process.env.PUBLIC_URL + img} width="50%" height="auto"></img>)
    }
    for(let i=0;i<props.files.length;i++){
      let f = props.files[i]
      files.push(<File name={f[0]} data={f[1]}/>)
    }
    for(let i=0;i<props.comments.length;i++){
      let comment = props.comments[i]
      comments.push(<Row><Comment text={comment[0]} appendedText={comment[1]}/></Row>)
    }
    for(let i=0;i<props.tags.length;i++){
      tags.push(props.tags[i])
    }
    return(<Container>
            <Row><div class="italic-large">Posted at {props.time} by {props.author}</div></Row>
            <Row>
              <Col xs={1}></Col>
              <Col xs={8}>
                <Row>{images}</Row>
                <Row>{files}</Row>
                {comments}
                <Tag tags={tags}/>
              </Col>
              <Col xs={1}></Col>
            </Row>
           </Container>);
};

//function Image(props){
//  console.log(process.env.PUBLIC_URL + props.src)
//  return(<img src={process.env.PUBLIC_URL + props.src} width="50%" height="auto"></img>)
//}


function Log(props){
  let data = props.data
  let id = props.id
  let header = testingConfigToTable(data["operator"],data["configname"],data["comps"],data["specs"],true)
  return(
    <Card style={{ width: '70rem' }}>
      <Card.Body>
        <Card.Title>{data["title"]}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">First Entry: {data["timestart"]}</Card.Subtitle>
        <Card.Subtitle className="mb-2 text-muted">Last Entry: {data["timestop"]}</Card.Subtitle>
        <ListGroup className="list-group-flush">
          <ListGroupItem>
            {header}
          </ListGroupItem>
          <Entries entries={props.entries} id={id} direction="forward"/>
        </ListGroup>
      </Card.Body>
    </Card>
  )
}

function Entries(props){
  let result=[]
  let entries = props.entries
  let logId = props.id
  let direction = props.direction
  if(direction=="reverse"){
    entries = entries.reverse()
  }
  let i = 0
  for(i=0; i< entries.length; i++){
    let entry = entries[i]
    if(entry["comments"].length!=0){
      result.push(<ListGroupItem>
                    <Row>
                      <Col xs={10}>
                        <Post id={entry["id"]} files={entry["files"]} images={entry["images"]} comments={entry["comments"]} time={entry["time"]} author={entry["author"]} tags={entry["tags"]}/>
                      </Col>
                      <Col xs={2}>
                      </Col>
                    </Row>
                    <Row>
                      <Col xs={10}>
                        <Container id={entry["id"]}>

                        </Container>
                      </Col>
                      <Col xs={2}>
                        <Container id={entry["id"] + "button"} class="wrapper-container">
                          <div class="vertical-bottom"><AppendButton logId={logId} entryId={entry["id"]} /></div>
                        </Container>
                      </Col>
                    </Row>
                  </ListGroupItem>)
    }
  }
  return result
}

function UnappendableEntries(props){
  let result=[]
  let entries = props.entries
  let i = 0
  for(i=0; i< entries.length; i++){
    let entry = entries[i]
    if(entry["comments"].length!=0){
      result.push(<ListGroupItem>
                    <Row>
                      <Col xs={12}>
                        <Post id={entry["id"]} files={entry["files"]} images={entry["images"]} comments={entry["comments"]} time={entry["time"]} author={entry["author"]} tags={entry["tags"]}/>
                      </Col>
                    </Row>
                    <Row>
                      <Col xs={10}>
                        <Container id={entry["id"]}>

                        </Container>
                      </Col>
                      <Col xs={2}>
                        <Container id={entry["id"] + "button"} class="wrapper-container">
                          <div class="vertical-bottom"><AppendButton logId={entry["logId"]} entryId={entry["id"]} /></div>
                        </Container>
                      </Col>
                    </Row>
                  </ListGroupItem>)
    }
  }
  return (<>{result}</>)
}

function AppendButton(props){
  let entryId = props.entryId
  let logId = props.logId
  let appendForm = (<AppendForm logId={logId} oldFiles={[]} comment={""} newPost={false} entryId={entryId}/>)

  function handleChange(){
    if(!appendingToPost){
      appendingToPost = true
      ReactDOM.render(appendForm, document.getElementById(entryId));
      ReactDOM.render(<CancelButton logId={logId} entryId={entryId}/>, document.getElementById(entryId + "button"));
    }
  }

  return(<Button variant="outline-secondary" onClick={() => handleChange()}>Append To</Button>)
}

function CancelButton(props){
  let entryId = props.entryId
  let logId = props.logId

  function handleChange(){
    appendingToPost = false
    ReactDOM.render(<div></div>, document.getElementById(entryId));
    ReactDOM.render(<AppendButton id="append-button" logId={logId} entryId={entryId}/>, document.getElementById(entryId + "button"));
  }

  return(<Button variant="outline-secondary" onClick={() => handleChange()}>Cancel</Button>)
}


function ViewLog(props){
  let id = query
  let data = {}
  let entries = []
  $.ajax({
    type: "GET",
    url: "/get_log/" + id,
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    success: function(result){
        data = result["data"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })
  $.ajax({
    type: "GET",
    url: "/get_entries/" + id,
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    success: function(result){
        entries = result["entries"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })
  console.log(entries)

  function handleChange(){
    if(lastLastUrl!="")window.location.href = lastLastUrl
  }


  return(<div className="App">
      <Container>
        <Row>
          <Col xs={12}>
            <ElogNavbar/>
            <Container>
              <Row>
              <Button id="back-button" variant="light" onClick={() => handleChange()}>Back</Button>
              <Line/>
              </Row>
              <Row>
                <Log id={id} data={data} entries={entries}/>
              </Row>
            </Container>
          </Col>
        </Row>
      </Container>
    </div>);
}

function EditLog(props){
  let id = props.logId

  let data = {}
  let entries = []
  $.ajax({
    type: "GET",
    url: "/get_entries/" + id,
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    success: function(result){
        entries = result["entries"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })

  return(<div id="editLog"><Entries id={id} entries={entries} direction="reverse"/></div>)
}


function AddLogEntry(props){
  //Has this log been written to?ss

  let header = false;
  let logId = 0

  $.ajax({
    type: "POST",
    url: "/header_exists",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify({"log":currentLog}),
    success: function(result){
        header = result["exists"]
        logId = result["logId"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  });


  let form = null;
  let tags = (<div></div>)
  let posted = (<div></div>)

  if(header===false){
    form = (<TestConfiguration/>)
  }else{
    form = (<AppendForm log={props.log} logId={logId} oldFiles={[]} comment={""} newPost={true} id="append-form"/>);
    tags = (<TagDropdownBox/>)
    posted = (<div id="posted-entries">Posted Entries</div>)
  }


  let toggle = props.log.charAt(0).toUpperCase() + props.log.slice(1) + " Log"
  let menu = []

  var log_opt = ''
  for(log_opt of list_of_logs){
    let name = log_opt.charAt(0).toUpperCase() + log_opt.slice(1) + " Log";
    let action = "#/write-to/" + log_opt.charAt(0).toLowerCase() + log_opt.slice(1) + "-log"
    menu.push(<Dropdown.Item href={action}>{name}</Dropdown.Item>)
  }

  let logSelection = (<Dropdown>
    <span>Adding to: </span>
    <Dropdown.Toggle variant="secondary" id="dropdown-basic">
      {toggle}
    </Dropdown.Toggle>

    <Dropdown.Menu>
      {menu}
    </Dropdown.Menu>
  </Dropdown>);


  let element = (
    <Container>
      <div id="info-group">
        <Row> <Clock/> </Row>
        <Row>
          <Container id="user">
            <User username={glob_user}/>
          </Container>
        </Row>
        <Row><SignIn show={false}/></Row>
      </div>
      <Row>
        <Col xs={3}/>
        <Col xs={3}>
          {logSelection}
        </Col>
        <Col xs={3}>{tags}</Col>
        <Col xs={3}/>
      </Row>
      {form}
      <Container id="edit-log">
        {posted}
        <EditLog logId={logId}/>
      </Container>
    </Container>
  );



  return (
    <div className="App">
      <Container>
        <Row>
          <Col xs={12}>
            <ElogNavbar/>
            {element}
          </Col>
        </Row>
      </Container>
    </div>
  );
}

function SignIn() {
  const [show, setShow] = useState(false);

  function signOut(){
    setShow(false);
    glob_user = "operator"
    setCookie("username","operator",3)
    ReactDOM.render(<User username={glob_user}/>, document.getElementById('user'))
  }
  function signIn(){
    setShow(false);
    let val = $("#enter-user-name").val()
    if(val.length===0){
      val ="operator"
    }
    glob_user = val
    setCookie("username",val,3)
    if(enteringTestConfig == true){
      $("#operator").val(val)
    }
    ReactDOM.render(<User username={glob_user}/>, document.getElementById('user'))
  }
  function handleShow(){
    setShow(true);
  }
  function handleClose(){
    setShow(false);
  }

  return (
    <>
      <Button id="sign-in" variant="light" svariant="secondary" onClick={handleShow}>
        Switch User
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Switch User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <InputGroup className="mb-3">
            <InputGroup.Prepend>
              <InputGroup.Text id="inputGroup-sizing-default">Name: </InputGroup.Text>
            </InputGroup.Prepend>
            <FormControl
              aria-label="Default"
              aria-describedby="inputGroup-sizing-default"
              id="enter-user-name"
            />
          </InputGroup>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={signOut}>
            Sign Out
          </Button>
          <Button variant="primary" onClick={signIn}>
            Sign In
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

async function addTestConfiguration(log,operator,name,pnames,pconfigs){
  console.log(pnames)
  console.log(pconfigs)
  let data = {"log":log, "operator":operator, "files":files, "name":name, "pnames":pnames,"pconfigs":pconfigs}
  //return;
  await $.ajax({
    type: "POST",
    url: "/add_config",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(data),
    success: function(result){
        console.log("success")
        let succ = result["successfullyWritten"]
        if(succ){
          return true;
        }else{
          sendAlert(false)
          return false;
        }
    },
    error: function(request, status, error){
        sendAlert(false)
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
        return false;
    }
  })

  glob_user = operator
  setCookie("username",operator,3)
}


function TestConfiguration(props) {
  const [validated, setValidated] = useState(false);

  enteringTestConfig = true

  const handleSubmit = (event) => {
    const form = event.currentTarget;

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
      setValidated(true);
    }
    else{
      event.preventDefault();
      event.stopPropagation();
      setValidated(false);
      let i = 0
      let operator = event.target.operator.value
      let name = event.target.config_name.value
      let pnames = []
      let pconfigs = []
      let components = [event.target.component0.value, event.target.component1.value, event.target.component2.value, event.target.component3.value, event.target.component4.value, event.target.component5.value, event.target.component6.value, event.target.component7.value, event.target.component8.value, event.target.component9.value]
      let numbers = [event.target.number0.value, event.target.number1.value, event.target.number2.value, event.target.number3.value, event.target.number4.value, event.target.number5.value, event.target.number6.value, event.target.number7.value, event.target.number9.value, event.target.number9.value]
      for(let i=0; i<components.length;i++){
        console.log(components[i])
        console.log(components[i]!="")
        console.log(components[i]!=="")
        if(components[i]!==""){
          pnames.push(components[i])
          pconfigs.push(numbers[i])
        }
      }
      let succ = addTestConfiguration(currentLog,operator,name,pnames,pconfigs)
      succ.then(function(result){
        console.log(succ)
        if(succ){
          enteringTestConfig = false
          ReactDOM.render(<AddLogEntry log={currentLog}/>, document.getElementById('root'));
        }else{
          sendAlert(false);
        }
      })
    }
  };

  let configs = []
  let names = []

  $.ajax({
    type: "GET",
    url: '/get_configs',
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    success: function(result){
        names = result["configs"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })

  console.log(names)

  for(var i=0; i<names.length;i++){
    let name = names[i]
    let urlName = name.replace(' ','-')
    configs.push(<Dropdown.Item href={rootUrl + "?" + urlName}>{name}</Dropdown.Item>);
  }
  //href={lastUrl + "?" + name}


  let config = []

  let configName = (<Form.Group id="configuration-input" as={Col} md="12" controlId="validationCustom01">
                      <Form.Control
                        required
                        id="config_name"
                        type="text"
                        name="config_name"
                        placeholder= "Configuration Name"
                        defaultValue=""
                      />
                    </Form.Group>);


  if(query!=null && query.length>1){
    $.ajax({
      type: "GET",
      url: "/get_config/" + query,
      dataType : "json",
      async: false,
      contentType: "application/json; charset=utf-8",
      success: function(result){
          console.log("success")
          config = result["config"]
      },
      error: function(request, status, error){
          console.log("Error");
          console.log(request)
          console.log(status)
          console.log(error)
      }
    })
    let name = query.replace('-',' ')
    configName = (<Form.Group id="comment-input" as={Col} md="12" controlId="validationCustom01">
                      <Form.Control
                        required
                        id="config_name"
                        type="text"
                        name="config_name"
                        value= {name}
                        defaultValue=""
                      />
                    </Form.Group>);
  }


  let result = []
  let j =0
  for(; j<config.length;j++){
    let c = config[j]
    result.push(
      <div class="test-config">
        <InputGroup className="mb-3">
          <FormControl value={c[0]} name={"component"+j.toString()}/>
          <FormControl value={c[1]} name={"number"+j.toString()}/>
        </InputGroup>
      </div>
    );
  }


  for(; j<10;j++){
    result.push(
                  <div class="test-config">
                    <InputGroup className="mb-3">
                      <FormControl placeholder="Component(s)" id="components" name={"component"+j.toString()}/>
                      <FormControl placeholder="Specification (ex. serial numbers)" id="components" name={"number"+j.toString()}/>
                    </InputGroup>
                  </div>
                );
  }


  let operator = ""

  if(glob_user!=="operator"){
    operator=glob_user
  }

  function clear(){
    window.location.href = rootUrl
    window.location.reload(false)
  }

  return (<div>
            <div class="italic" id="info">No configuration has been submitted for the log</div>
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              <Form.Row>
              <Container>
                <Row>
                  <Col xs = "3">

                    <DropdownButton id="dropdown-adv" title="Load Previous">
                      {configs}
                    </DropdownButton>

                    <Button id="reset" variant="secondary" onClick={() => clear()}>Reset</Button>

                  </Col>
                  <Col xs = "9">
                    <Form.Group id="comment-input" as={Col} md="12" controlId="validationCustom01">
                            <Form.Control
                            required
                            id="operator"
                            type="text"
                            name="operator"
                            placeholder= "Operator(s)"
                            defaultValue={operator}
                          />
                    </Form.Group>


                    {configName}
                  </Col>
                </Row>
              </Container>
              </Form.Row>
              <Container>
                <Row>
                  <Col xs="3">

                  </Col>
                  <Col xs="9">
                    {result}
                    <Button type="submit">Submit</Button>
                  </Col>
                </Row>
              </Container>
            </Form>
            <div id="empty"></div>
          </div>);
}


function LogCard(props){
  return(<Card style={{ width: '33.3%' }}>
    <Card.Body>
    <Card.Title>{props.title}</Card.Title>
      <Card.Text>
        {props.text}
      </Card.Text>
      <Card.Link href={"#/view/log?" + props.id}>View Log</Card.Link>
    </Card.Body>
    <Card.Footer>
    <small className="text-muted">Last updated {props.updated}</small>
    </Card.Footer>
  </Card>);
}

function testingConfigToTable(operator, config_name, components,specs, showDetails){
  let configs = []
  if(showDetails){
    let table = []
    for(var i = 0; i<components.length; i++){
      table.push(<tr>
                      <td>{components[i]}</td>
                      <td>{specs[i]}</td>
                    </tr>);
    }
    configs = (<Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>Specification</th>
                  </tr>
                </thead>
                <tbody>
                  {table}
                </tbody>
              </Table>);
  }
return(<div>
          <Table striped bordered hover><thead><tr><th>Operator(s)</th></tr></thead><tbody><tr><td>{operator}</td></tr></tbody></Table>
          <Table striped bordered hover><thead><tr><th>Configuration Name</th></tr></thead><tbody><tr><td>{config_name}</td></tr></tbody></Table>
          {configs}
        </div>);
}


function sendAlert(success){
  if(success==true){
    render(<Alert id="success" variant="success" dismissible>Success</Alert>,document.getElementById('empty'));
    setTimeout(() => {   render(<div/>,document.getElementById('empty')); }, 3000);
  }
  if(success==false){
    render(<Alert id="success" variant="warning" dismissible>Warning! Something went wrong!</Alert>,document.getElementById('empty'));
    setTimeout(() => {   render(<div/>,document.getElementById('empty')); }, 3000);
  }
}


function AppendForm(props) {
  const [validated, setValidated] = useState(false);
  let comment = props.comment
  let newPost = props.newPost
  let entryId = props.entryId
  let logId = props.logId
  if(comment.length==0){
    comment = "Enter comment here"
  }

  const handleSubmit = (event) => {
    const form = event.currentTarget;

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
      setValidated(true);
    }
    else{
      event.preventDefault();
      event.stopPropagation();
      setValidated(false);
      if(newPost){
        appendEntry(currentLog, glob_user,uploadedFiles[1],uploadedImages[1],event.target.comment.value,false)
        form.reset()
      }else{
        appendToEntry(logId, entryId, glob_user, uploadedFiles[0], uploadedImages[0], event.target.comment.value,false)
      }
    }
  };

  return (
    <div>
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      <FileDrop id="file-drop" newPost={newPost}/>
      <Form.Row>
        <Form.Group id="comment-input" as={Col} md="12" controlId="validationCustom01">
          <Form.Control
            required
            type="text"
            name="comment"
            placeholder= {comment}
            defaultValue=""
            id="enter-comment"
          />
        </Form.Group>
      </Form.Row>
      <Row>
       <Col xs={4}/>
        <Col xs={4}>
          <Button variant="primary" type="submit">Submit Entry</Button>
        </Col>
        <Col xs={4}/>
      </Row>
    </Form>
    <div id="empty"></div>
    </div>
  );
}


function appendToEntry(logId,entryId,author,entryFiles,entryImages,comment,close){
  let sentFiles = []
  for(var i=0;i<entryFiles.length;i++){
    let thisFile = entryFiles[i]
    sentFiles.push([thisFile["name"], thisFile["storedData"]])
  }
  let sentImages = []

  for(var i=0;i<entryImages.length;i++){
    let thisImage = entryImages[i]
    sentImages.push([thisImage["name"], btoa(thisImage["storedData"])])
  }


  let data = {"logId":logId, "entryId": entryId, "author":author, "files":sentFiles, "images":sentImages, "comment":comment}

  $.ajax({
    type: "POST",
    url: "/append_to_post",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(data),
    success: function(result){
        console.log("success")
        let succ = result["successfullyWritten"]
        if(succ){
          uploadedImages[0] = []
          uploadedFiles[0] = []
          files[0] = []
          shownFiles[0] = []
          appendingToPost = false
          if(rootUrl.indexOf("#/view/log")==0){
            ReactDOM.render(<ViewLog/>, document.getElementById('root'));
          }
          else if(rootUrl.indexOf("#/write-to/")==0){
            ReactDOM.render(<EditLog logId={logId}/>, document.getElementById("edit-log"))
          }
          else if(rootUrl.indexOf("#/search-entries")==0){
            let keyword = $("#keyword").val()
            let query_parts = query.split(",")
            let now = new Date();
            let end_date = now.toISOString().slice(0,10);
            now.setDate(1)
            let start_date = now.toISOString().slice(0,10)
            let tag = "all"
            let log = "all"
            for(var i=0; i<query_parts.length; i++){
              let part = query_parts[i].split("=")
              if(part[0]=="start"){
                start_date = part[1]
              }
              else if(part[0]=="end"){
                end_date = part[1]
              }
              else if(part[0]=="log"){
                log = part[1]
              }
              else if(part[0]=="tag"){
                tag = part[1].replace("_"," ")
              }
            }
            searchEntries(start_date,end_date,log,tag,keyword)
          }
        }else{
          sendAlert(false)
        }
    },
    error: function(request, status, error){
        sendAlert(false)
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })

  for(var i=0;i<entryImages.length;i++){
    let thisImage = entryImages[i]

    const data = new FormData();
    data.append('file',thisImage)
    data.append('filename',thisImage["name"])
    data.append('log',currentLog)

    //uploadImage(data)
    //uploadImage2(data)
    fetch('http://localhost:4040/upload', {
      method: 'POST',
      body: data,
    }).then((response) => {
      response.json().then((body) => {
        this.setState({ imageURL: `http://localhost:4040/${body.file}` });
      });
    });
  }
}

function appendEntry(log,author,entryFiles,entryImages,comment){
  let sentFiles = []
  console.log(entryFiles)
  for(var i=0;i<entryFiles.length;i++){
    let thisFile = entryFiles[i]
    sentFiles.push([thisFile["name"], thisFile["storedData"]])
  }
  let sentImages = []
  console.log(entryImages)

  for(var i=0;i<entryImages.length;i++){
    let thisImage = entryImages[i]
    console.log(btoa(thisImage["storedData"]))
    sentImages.push([thisImage["name"], btoa(thisImage["storedData"])])
  }

  let tag = query.replace("_"," ")
  let data = {"log":log, "author":author, "files":sentFiles, "images":sentImages, "comment":comment, "tag":[tag]}
  let succ = false
  //return;
  $.ajax({
    type: "POST",
    url: "/add_entry",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(data),
    success: function(result){
        console.log("success")
        succ = result["successfullyWritten"]
        console.log(succ)
        if(succ){
          uploadedImages[1] = []
          uploadedFiles[1] = []
          files[1] = []
          shownFiles[1] = []
          //ReactDOM.render(<AddLogEntry log={currentLog}/>, document.getElementById('root'));
        }else{
          sendAlert(false)
        }
    },
    error: function(request, status, error){
        sendAlert(false)
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })

  for(var i=0;i<entryImages.length;i++){
    let thisImage = entryImages[i]

    const data = new FormData();
    data.append('file',thisImage)
    data.append('filename',thisImage["name"])
    data.append('log',currentLog)

    //uploadImage(data)
    //uploadImage2(data)
    fetch('http://localhost:4040/upload', {
      method: 'POST',
      body: data,
    }).then((response) => {
      response.json().then((body) => {
        this.setState({ imageURL: `http://localhost:4040/${body.file}` });
      });
    });
  }

  if(succ){
    ReactDOM.render(<AddLogEntry log={currentLog}/>, document.getElementById('root'));
    ReactDOM.render(<FileDrop id="file-drop" newPost={true}/>, document.getElementById("file-drop-append-to-log"));
  }
}

async function uploadImage(data){
  fetch('http://localhost:4040/upload', {
      method: 'POST',
      body: data,
    }).then((response) => {
      response.json().then((body) => {
        this.setState({ imageURL: 'http://localhost:4040/${body.file}' });
      });
    });
}



function TagDropdownBox(props){
  let selection = "None"
  console.log(query.length)
  if(query.length>1){
    selection=query.slice(0,1).toUpperCase() + query.slice(1)
    selection = selection.replace("_"," ")
  }
  let items = []

  let tags = {}

  $.ajax({
    type: "GET",
    url: "/fetch_tags",
    dataType : "json",
    async: false,
    contentType: "application/json; charset=utf-8",
    success: function(result){
        tags = result["tags"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })

  let tag_selections = tags[currentLog]
  for(let i=0; i<tag_selections.length; i++){
    let tagUrl = tag_selections[i].replace(" ","_")
    if(tagUrl==="None"){
      console.log("None")
      items.push(<Dropdown.Item href={rootUrl}>{tag_selections[i]}</Dropdown.Item>)
    }else{
      items.push(<Dropdown.Item href={rootUrl + "?" + tagUrl}>{tag_selections[i]}</Dropdown.Item>)
    }
  }
  return(
    <Dropdown>
      <span>Tag: </span>
      <Dropdown.Toggle variant="secondary" id="dropdown-basic">
        {selection}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {items}
      </Dropdown.Menu>
    </Dropdown>
  );
}


class GenericButton extends React.Component{
  constructor(props){
    super(props)
    this.text = props.text
    this.inside = props.inside
    this.id = props.id
    this.onChange = props.onChange;
    this.handleChange = this.handleChange.bind(this)
  }

  handleChange(){
    this.onChange(this.id)
  }

  render(){
    return(

      <div> {this.text} <button className='btn btn-link' onClick={() => this.handleChange()}>{this.inside}</button></div>
    );
  }
}



const thumbsContainer = {
  display: 'flex',
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginTop: 16,
};

const thumb = {
  display: 'inline-flex',
  borderRadius: 2,
  border: '1px solid #eaeaea',
  marginBottom: 8,
  marginRight: 8,
  width: 100,
  height: 100,
  padding: 4,
  boxSizing: 'border-box'
};

const thumbInner = {
  display: 'flex',
  minWidth: 0,
  overflow: 'hidden'
};

const img = {
  display: 'block',
  width: 'auto',
  height: '100%'
};


function FileDrop(props) {
  let ind = 0
  if(props.newPost){
    ind = 1
  }

  const [value, setValue, getValue] = React.useState("");
  //Dropzone.myDropzone.options = {};
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone({
    getFilesFromEvent: event => myCustomFileGetter(event, ind)
  });
  let files = []

  function handleChange(name){
    for(var i = 0; i < shownFiles[ind].length;i++){
      if (shownFiles[ind][i].name===name) {
       shownFiles[ind].splice(i,1);
      }
    };
    for(var i = 0; i < uploadedFiles[ind].length;i++){
      if (uploadedFiles[ind][i].name===name) {
        uploadedFiles[ind].splice(i,1);
      }
    };
    for(var i = 0; i < uploadedImages[ind].length;i++){
      if (uploadedImages[ind][i].name===name) {
        uploadedImages[ind].splice(i,1);
      }
    };
    setValue(iter++);
  }

  if(last===shownFiles[ind].length){
    buttonId = buttonId-shownFiles[ind].length
  }

  for (var i = 0; i < shownFiles[ind].length; i++) {
    let name = shownFiles[ind][i]["name"]
    files.push(<GenericButton key={buttonId++} id={name} onChange={handleChange} text={name} inside={"X"}/>)
  }

  last=shownFiles[ind].length

  const thumbs = uploadedImages[ind].map(file => (
    <div style={thumb} key={file.name}>
      <div style={thumbInner}>
        <img
          src={file.preview}
          style={img}
        />
      </div>
    </div>
  ));

  useEffect(() => () => {
    // Make sure to revoke the data uris to avoid memory leaks
    uploadedImages[ind].forEach(file => URL.revokeObjectURL(file.preview));
  }, [uploadedImages[ind]]);

  let containerId = "file-drop-append-to-post"
  if(props.newPost){
    containerId = "file-drop-append-to-log"
  }

  return (
    <Container id={containerId}>
      <hr/>
      <div {...getRootProps({className: 'dropzone'})}>
        <input {...getInputProps()} />
        <span>Drag 'n' drop some files here, or click to select files</span>
      </div>
      <hr/>
      <div>
        Uploaded Files
        {files}
      </div>
      <div>
        <aside style={thumbsContainer}>
          {thumbs}
        </aside>
      </div>
    </Container>
  );
}

Array.prototype.remove = function() {
  var what, a = arguments, L = a.length, ax;
  while (L && this.length) {
      what = a[--L];
      while ((ax = this.indexOf(what)) !== -1) {
          this.splice(ax, 1);
      }
  }
  return this

};


async function myCustomFileGetter(event, ind) {
  const files = [];
  const fileList = event.dataTransfer ? event.dataTransfer.files : event.target.files;

  for (var i = 0; i < fileList.length; i++) {
    const file = fileList.item(i);

    const reader = new FileReader()

    reader.onabort = () => console.log('file reading was aborted')
    reader.onerror = () => console.log('file reading has failed')
    reader.onload = () => {
    // Do whatever you want with the file contents
      const res = reader.result
      Object.assign(file, {
        storedData: res
      })
    }


    if(file.name.endsWith(".jpg") || file.name.endsWith(".png") || file.name.endsWith(".jpeg") || file.name.endsWith(".PNG")){
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
      console.log(uploadedImages)
      console.log(uploadedImages[ind])
      console.log(ind)
      uploadedImages[ind].push(file)
      files.push(file);
      shownFiles[ind].push(file)

      reader.readAsBinaryString(file)
    }
    if(file.name.endsWith(".txt") || file.name.endsWith(".csv")){
      uploadedFiles[ind].push(file)
      reader.readAsText(file)

      files.push(file);
      shownFiles[ind].push(file)
    }
  }

  return files;
}


function ElogNavbar(props){
  return (<Navbar bg="primary" variant="dark">
            <Nav className="mr-auto">
              <Nav.Link href="#/write-to/operations-log">Add Log Entry</Nav.Link>
              <Nav.Link href="#/view-logs">View Logs</Nav.Link>
              <Nav.Link href="#/search-configurations">Search Configurations</Nav.Link>
              <Nav.Link href="#/search-entries">Search Entries</Nav.Link>
            </Nav>
            <Navbar.Brand href="#/write-to/operations-log">Lyncean Elog</Navbar.Brand>
          </Navbar>);
}

class Appended{
  constructor(author,date){
    this.message = "Appended on" + author + "by" + date
  }
}


let Comment = function(props){
  let text = props.text
  let appendedText = props.appendedText
  return(<Row>
          <span>{text}</span>
          <span class="italic-large">{appendedText}</span>
         </Row>
  );
}

let Tag = function(props){
  let tag = "Tagged with: " + props.tags
  return(<div class="italic-large">{tag}</div>);
}

let File = function(props){
  let name = props.name
  let data = props.data
  let blob = new Blob([data], {type: "text/plain"});
  let ref = URL.createObjectURL(blob);

  return <div><a href={ref} target="_blank"> {name} </a></div>
}


class Clock extends React.Component{
  constructor(props){
    super(props)
    this.state = {date: new Date()}
  }

  componentDidMount(){
     window.setInterval(function () {
      this.setState({date: new Date()});
    }.bind(this), 1000);
  }

  render(){
    return(<div class="italic-padded">{this.state.date.toLocaleString()}</div>);
  }
}

let User = function(props){
  let username = props.username
  return(<div class="italic">Currently logged in as {username}</div>);
}

let Line = function(props){
  return (<div/>);
}

export default App;
