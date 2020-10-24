import React, { useState, setShow, useEffect } from 'react';
import ReactDOM, { render } from 'react-dom'
import logo from './logo.svg';
import './App.css';
import Dropzone from 'react-dropzone';
import {useDropzone} from 'react-dropzone';
import { getDroppedOrSelectedFiles } from 'html5-file-selector';
import styled from 'styled-components';
import useForceUpdate from 'use-force-update';
import jsxToString from 'jsx-to-string';
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
import ButtonGroup from 'react-bootstrap/ButtonGroup'
import ToggleButton from 'react-bootstrap/ToggleButton'
import Table from 'react-bootstrap/Table'
import CardGroup from 'react-bootstrap/CardGroup'
import 'bootstrap/dist/css/bootstrap.min.css';
import ListGroup from 'react-bootstrap/ListGroup'
import ListGroupItem from 'react-bootstrap/ListGroupItem'
import $ from "jquery";
import DropdownMenu from 'react-bootstrap/esm/DropdownMenu';
import DropdownButton from 'react-bootstrap/DropdownButton'
import { saveAs } from 'file-saver';
import request from "superagent";

let buttonId = 0
let iter = 0
let last=-1
let files = []
let shownFiles = []
let uploadedImages = []
let alerts = [<Alert key={1} variant="success">Success</Alert>,<Alert key={2} variant="warning">Warning, changes may have not gone through!</Alert>]
const list_of_logs = ["Electronics"]
let lastUrl = ""
let query = ""
let testing_config_entered = true;
let currentLog = ""
let rootUrl = ""

//THESE ARE TEMPORARY AND SHOULD BE REMOVED WHEN APP INTEGRATED IN FLASK SERVER
let glob_user = "operator"
let glob_subsystems = ["MUX","MtrCntrl","Sync","InjLsFdbk","PwrMtr","LLRF","RFPPA","VacRad","SbandAmp","UniPolar","BiPolar","BPM","TSDG", "Magnets", "Mod"]


function App() {
  let endOfUrl = window.location.href.indexOf("#")
  let currUrl = window.location.href.slice(endOfUrl)

  let q = currUrl.indexOf("?")
  if(q==-1){
    q = currUrl.length
  }
  query = currUrl.slice(q+1)
  rootUrl = currUrl.slice(0,q)
  console.log(rootUrl)

  lastUrl = currUrl
  const element = <h1></h1>;
  if(currUrl.indexOf("#/write-to/electronics-log")==0){
    currentLog = "electronics"
    return(<AddLogEntry log={currentLog}/>);
  }
  else if(currUrl.indexOf("#/view/recent-logs")==0){
    return(<RecentLogs/>);
  }
  else if(currUrl.indexOf("#/view/log")==0){
    return(<ViewLog/>);
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
  let prev_query = query
  query = currUrl.slice(q+1)
  rootUrl = currUrl.slice(0,q)
  if(lastUrl!=currUrl){
    const element = <h1></h1>;
    if(currUrl.indexOf("#/write-to/electronics-log")==0){
      currentLog = "electronics"
      ReactDOM.render(<AddLogEntry log={currentLog}/>, document.getElementById('root'));
    }
    else if(currUrl.indexOf("#/view/recent-logs")==0){
      ReactDOM.render(<RecentLogs/>, document.getElementById('root'));
    }
    else if(currUrl.indexOf("#/view/log")==0){
      ReactDOM.render(<ViewLog/>, document.getElementById('root'));
    }
    else{
      ReactDOM.render(element, document.getElementById('root'));
      window.location.reload(false);
    }
    if(prev_query!=query){
      window.location.reload(false);
    }
    lastUrl = currUrl;
  }
}

setInterval(tick, 100);

function Post(props){
    let files = []
    let comments = []
    let tags = []
    for(let i=0;i<props.files.length;i++){
      files.push(<File path={props.files[i]}/>)
    }
    for(let i=0;i<props.comments.length;i++){
      comments.push(<Comment text={props.comments[i]}/>)
    }
    for(let i=0;i<props.tags.length;i++){
      tags.push(props.tags[i])
    }
    return(<Container>
            <Row><div class="italic-large">Posted at {props.time} by {props.author}</div></Row>
            <Row>
              <Col xs={12}>
                <Row>{files}</Row>
                <Row>{comments}</Row>
                <Tag tags={tags}/>
              </Col>
            </Row>
           </Container>);
};


function Log(props){
  let data = props.data
  let header = testingConfigToTable(data["operator"],data["configname"],data["comps"],data["specs"],true)
  return(
    <Card style={{ width: '80rem' }}>
      <Card.Body>
        <Card.Title>{data["title"]}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">First Entry: {data["timestart"]}</Card.Subtitle>
        <Card.Subtitle className="mb-2 text-muted">Last Entry: {data["timestop"]}</Card.Subtitle>
        <ListGroup className="list-group-flush">
          <ListGroupItem>
            {header}
          </ListGroupItem>
          <Entries entries={props.entries}/>
        </ListGroup>
        <Card.Link href="#">Previous Day's Log</Card.Link>
        <Card.Link href="#">Next Day's Log</Card.Link>
      </Card.Body>
    </Card>
  )
}

function Entries(props){
  let result=[]
  let entries = props.entries
  let i = 0
  for(i=0; i< entries.length; i++){
    let entry = entries[i]
    result.push(<ListGroupItem><Post files={entry["files"]} comments={entry["comments"]} time={entry["time"]} author={entry["author"]} tags={entry["tags"]}/></ListGroupItem>)
  }
  return result
}

function getLogData(id){
  let data = {"operator": "Rod L", "configname" : "High Power RF Test", "comps" : ["Structures","Loads"], "specs" : ["####","####"], "timestart" : "09:00 AM","timestop" : "05:00 PM", "title": "Testing Log 10/18/20"}
  return data
  $.ajax({
    type: "POST",
    url: "/get_log",
    dataType : "json",
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify({"id":id}),
    success: function(result){
        return result["data"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })
}

function getLogEntries(id){
  $.ajax({
    type: "POST",
    url: "/get_entries",
    dataType : "json",
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify({"id":id}),
    success: function(result){
        return result["entries"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })
}


function ViewLog(props){
  let id = query
  console.log(id)
  //let data = getLogData(id)
  //let entries = getLogEntries(id)
  let data = {"operator": "Rod L", "configname" : "High Power RF Test", "comps" : ["Structures","Loads"], "specs" : ["####","####"], "timestart" : "09:00 AM","timestop" : "05:00 PM", "title": "Testing Log 10/18/20"}
  let entries = [{"files":["file"],"comments":["testing testing 1 2 3"],"tags":["testing"],"time": "2:37", "author":"operator"}]


  function handleChange(){
    window.location.href = "#/view/recent-logs"
    window.location.reload(false);
  }

  function saveAsPdf(){

  }


  return(<div className="App">
      <Container>
        <Row>
          <Col xs={12}>
            <ElogNavbar/>
            <Container>
              <Row>
              <Button id="back-button" variant="light" onClick={() => handleChange()}>Back</Button>
              <Button id="back-button" variant="light" onClick={() => saveAsPdf()}>Save as PDF</Button>
              <Line/>
              </Row>
              <Row>
                <Log data={data} entries={entries} />
              </Row>
            </Container>
          </Col>
        </Row>
      </Container>
    </div>);
}

function getRecentLogIds(){
  return [0]
  $.ajax({
    type: "POST",
    url: "/get_recent",
    dataType : "json",
    contentType: "application/json; charset=utf-8",
    success: function(result){
        return result["ids"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
    }
  })
}

function AddLogEntry(props){
  return (
    <div className="App">
      <Container>
        <Row>
          <Col xs={12}>
            <ElogNavbar/>
            <WriteToLog log={props.log}/>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

function RecentLogs(props){
  return (
    <div className="App">
      <Container>
        <Row>
          <Col xs={12}>
            <ElogNavbar/>
            <LogMenu/>
          </Col>
        </Row>
      </Container>
    </div>
  );
}


function header_exists(log){
  console.log(testing_config_entered)
  if(testing_config_entered==false){
    return false;
  }
  return true;
  $.ajax({
        type: "POST",
        url: "/header_exists",
        dataType : "json",
        contentType: "application/json; charset=utf-8",
        data : JSON.stringify(log),
        success: function(result){
            return result["exists"]
        },
        error: function(request, status, error){
            console.log("Error");
            console.log(request)
            console.log(status)
            console.log(error)
        }
    });
}

function change_autocommit(log,value){
  return true
  $.ajax({
    type: "POST",
    url: "/set_automcommit",
    dataType : "json",
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify({"log":log,"value":value}),
    success: function(result){
        return result["succ"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
        return false
    }
});
}

class WriteToLog extends React.Component{
  constructor(props){
    super(props)
    console.log(query)
    this.state = {log:props.log, subsytem:query}
    //Has this log been written to?
    this.form = (<AppendForm log={"selected_log"} oldFiles={[]} comment={""}/>);

    if(header_exists(props.log)==false){
      this.form = (<TestConfiguration/>)
    }

    this.element = (
      <Container>
        <div id="info-group">
          <Row> <Clock/> </Row>
          <Row> <User username={glob_user}/></Row>
        </div>
        <Row>
          <Col xs={4}><LogDropdownBox log={this.state.log} prepend={"Adding Entry to: "}/></Col>
          <Col xs={3}><SubsystemDropdownBox/></Col>
          <Col xs={3}><AutosaveLog value={'1'}/></Col>
          <Col xs={2}><ManualSave/></Col>
        </Row>
        {this.form}
      </Container>
    );
  }

  render(){
    return this.element
  }
}

function addTestConfiguration(log,operator,name,pnames,pconfigs){
  //window.location.reload(false);
  query = {"log":log, "operator":operator, "files":files, name:"name", "pnames":pnames,"pconfigs":pconfigs}
  //return;
  $.ajax({
    type: "POST",
    url: "/get_log",
    dataType : "json",
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(query),
    success: function(result){
        console.log("success")
        let succ = result["successfullyWritten"]
        if(succ){
          window.location.reload(false);
          return true;
        }else{
          testing_config_entered=false
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
}


function TestConfiguration(props) {
  const [validated, setValidated] = useState(false);

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
      let checked = [event.target.checked0.checked,event.target.checked1.checked,event.target.checked2.checked,event.target.checked3.checked,event.target.checked4.checked]
      let components = [event.target.component0.value, event.target.component1.value, event.target.component2.value, event.target.component3.value, event.target.component4.value]
      let numbers = [event.target.number0.value, event.target.number1.value, event.target.number2.value, event.target.number3.value, event.target.number4.value]
      for(let i=0; i<checked.length;i++){
        if(checked[i]){
          pnames.push(components[i])
          pconfigs.push(numbers[i])
        }
      }
      if(addTestConfiguration(currentLog,operator,name,pnames,pconfigs)){
        testing_config_entered= true;
        ReactDOM.render(<AddLogEntry log={currentLog}/>, document.getElementById('root'));
      }else{

      }
    }
  };

  let result = []
  let i =0
  for(; i<5;i++){
    result.push(
                  <div class="test-config">
                    <InputGroup className="mb-3">
                      <InputGroup.Prepend>
                        <InputGroup.Checkbox name={"checked"+i.toString()}/>
                      </InputGroup.Prepend>
                      <FormControl placeholder="Component(s)" name={"component"+i.toString()}/>
                      <FormControl placeholder="Specification (ex. serial numbers)" name={"number"+i.toString()}/>
                    </InputGroup>
                  </div>
                );
  }
  return (<div>
            <div class="italic" id="info">No configuration has been submitted for the testing log</div>
            <Form noValidate validated={validated} onSubmit={handleSubmit}>
              <Form.Row>
              <Container>
                <Row>
                  <Col xs = "3">
                    <DropdownButton id="dropdown-adv" title="Load Previous">
                      <Dropdown.Item href="#/action-1">Example Config</Dropdown.Item>
                      <Dropdown.Item href="#/action-1">Another Saved Config</Dropdown.Item>
                    </DropdownButton>
                  </Col>
                  <Col xs = "9">
                    <Form.Group id="comment-input" as={Col} md="12" controlId="validationCustom01">
                            <Form.Control
                            required
                            id="operator"
                            type="text"
                            name="operator"
                            placeholder= "Operator(s)"
                            defaultValue=""
                          />
                    </Form.Group>


                    <Form.Group id="comment-input" as={Col} md="12" controlId="validationCustom01">
                      <Form.Control
                        required
                        id="config_name"
                        type="text"
                        name="config_name"
                        placeholder= "Configuration Name"
                        defaultValue=""
                      />
                    </Form.Group>
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


function LogMenu(props){

  let ids = getRecentLogIds()
  let items = []

  console.log(ids)

  for(let i=0;i<ids.length;i++){
    let data = getLogData(i)
    console.log(data)

    let text = testingConfigToTable(data["operator"],data["configname"],[],[],false)
    let title = data["title"]
    let id = ids[i]
    let updated = data["timestop"]

    let example = (<div>Header entry shown here.</div>);

    items.push(<LogCard text={text} title={title} id={id} updated={updated}/>);
  }

  return(<CardGroup>{items}</CardGroup>);

}

let Image = function(props){
  let url = props.url
  //let name = url.substring(url.lastIndexOf('.'))
  //let isCaptioned = props.isCaptioned
  //let caption = props.caption
  return (<Container>
            <Row>
              <Col xs={10}>
                <Image src={url} thumbnail />
              </Col>
            </Row>
          </Container>);
}

function LogCard(props){
  return(<Card style={{ width: '18rem' }}>
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
  let oldFiles = props.oldFiles
  let comment = props.comment
  if(comment.length==0){
    comment = "Enter comment here"
  }

  const handleSubmit = (event) => {
    const form = event.currentTarget;

    console.log(event.target.comment.value)

    if (form.checkValidity() === false) {
      event.preventDefault();
      event.stopPropagation();
      setValidated(true);
    }
    else{
      event.preventDefault();
      event.stopPropagation();
      setValidated(false);
      console.log("bollocks")
      appendEntry(currentLog, glob_user,files,event.target.comment.value,uploadedImages,false)
      //window.location.reload(false);
      //uploadedImages = []
      //oldFiles = []
      //form.reset()
      //console.log(files)
    }
  };


  return (
    <div>
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      <FileDrop oldFiles={oldFiles} />
      <Form.Row>
        <Form.Group id="comment-input" as={Col} md="12" controlId="validationCustom01">
          <Form.Control
            required
            type="text"
            name="comment"
            placeholder= {comment}
            defaultValue=""
          />
        </Form.Group>
      </Form.Row>
      <Button type="submit">Submit form</Button>
    </Form>
    <div id="empty"></div>
    </div>
  );
}

function appendEntry(log,author,files,comment,images,isAppended){

  //window.location.reload(false);
  query = {"log":log, "author":author, "files":files, comment:"comment", "images":images,"isAppended":isAppended}
  //return;
  $.ajax({
    type: "POST",
    url: "/get_log",
    dataType : "json",
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify(query),
    success: function(result){
        console.log("success")
        let succ = result["successfullyWritten"]
        if(succ){
          files = []
          uploadedImages = []
          window.location.reload(false);
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

}

function AutosaveLog(props) {
  const [checked, setChecked] = useState(false);
  const [radioValue, setRadioValue] = useState(props.value);

  const radios = [
    { name: 'On', value: '1' },
    { name: 'Off', value: '0' },
  ];

  function changeAutoSave(val){
    console.log(val)

    let success = change_autocommit(currentLog,val)

    if(success){
      if(val==0 || val==1){
        setRadioValue(val)
      }
      sendAlert(true)
    }else{
      sendAlert(false)
    }
  }

  return (
      <Container>
        <span>Autocommit: </span>
        <ButtonGroup toggle>
          {radios.map((radio, idx) => (
            <ToggleButton
              key={idx}
              type="radio"
              variant="light"
              name="radio"
              value={radio.value}
              checked={radioValue === radio.value}
              onChange={(e) => changeAutoSave(e.currentTarget.value)}
            >
              {radio.name}
            </ToggleButton>
          ))}
        </ButtonGroup>
      </Container>
  );
}


class LogDropdownBox extends React.Component{
  constructor(props){
    super(props)
    let toggle = props.log.charAt(0).toUpperCase() + props.log.slice(1) + " Log"
    let menu = []

    var log_opt = ''
    for(log_opt of list_of_logs){
      let name = log_opt.charAt(0).toUpperCase() + log_opt.slice(1) + " Log";
      let action = "#/write-to/" + log_opt + "-log"
      menu.push(<Dropdown.Item href={action}>{name}</Dropdown.Item>)
    }
    this.state = {toggle:toggle,menu:menu,prepend:props.prepend}
  }

  render(){
    return(
          <Dropdown>
            <span>{this.state.prepend}</span>
            <Dropdown.Toggle variant="secondary" id="dropdown-basic">
              {this.state.toggle}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              {this.state.menu}
            </Dropdown.Menu>
          </Dropdown>);
  }
}

function SubsystemDropdownBox(props){
  let selection = "None"
  console.log(query.length)
  if(query.length>1){
    selection=query.slice(0,1).toUpperCase() + query.slice(1)
  }
  let items = []
  for(let i=0; i<glob_subsystems.length; i++){
  items.push(<Dropdown.Item href={rootUrl + "?" + glob_subsystems[i]}>{glob_subsystems[i]}</Dropdown.Item>)
  }
  return(
    <Dropdown>
      <span>Subsystem: </span>
      <Dropdown.Toggle variant="secondary" id="dropdown-basic">
        {selection}
      </Dropdown.Toggle>
      <Dropdown.Menu>
        {items}
      </Dropdown.Menu>
    </Dropdown>
  );
}

class ManualSave extends React.Component{
  constructor(props){
    super(props)
    this.text = props.text
    this.inside = props.inside
    this.id = props.id
    this.onChange = props.onChange;
    this.handleChange = this.handleChange.bind(this)
  }

  handleChange(){
    console.log('manual save button pressed')
    let success = manualSave(currentLog, this.id)
    sendAlert(success)
  }

  render(){
    return(
      <Button variant="light" onClick={() => this.handleChange()}>Manual Commit</Button>
    );
  }
}

function manualSave(log,id){
  return true
  $.ajax({
    type: "POST",
    url: "/get_log",
    dataType : "json",
    contentType: "application/json; charset=utf-8",
    data : JSON.stringify({"log":log,"id":id}),
    success: function(result){
        return result["succ"]
    },
    error: function(request, status, error){
        console.log("Error");
        console.log(request)
        console.log(status)
        console.log(error)
        return false
    }
  })
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
  const [value, setValue, getValue] = React.useState("");
  //Dropzone.myDropzone.options = {};
  const {acceptedFiles, getRootProps, getInputProps} = useDropzone({
    getFilesFromEvent: event => myCustomFileGetter(event)
  });
  shownFiles = props.oldFiles
  let files = []

  function handleChange(name){
    for(var i = 0; i < shownFiles.length;i++){
      if (shownFiles[i].name===name) {
       shownFiles.splice(i,1);
       uploadedImages.splice(i,1);
       files.splice(i,1);
      }
    };
    setValue(iter++);
  }

  if(last===shownFiles.length){
    buttonId = buttonId-shownFiles.length
  }

  for (var i = 0; i < shownFiles.length; i++) {
    const f = shownFiles[i];
    files.push(<GenericButton key={buttonId++} id={f.name} onChange={handleChange} text={f.name} inside={"X"}/>)
  }

  last=shownFiles.length

  const thumbs = uploadedImages.map(file => (
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
    uploadedImages.forEach(file => URL.revokeObjectURL(file.preview));
  }, [uploadedImages]);


  return (
    <Container id="file-drop">
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


async function myCustomFileGetter(event) {
  const files = [];
  const fileList = event.dataTransfer ? event.dataTransfer.files : event.target.files;

  for (var i = 0; i < fileList.length; i++) {
    const file = fileList.item(i);
    console.log(file)


    files.push(file);
    shownFiles.push(file)


    if(file.name.endsWith(".jpg") || file.name.endsWith(".png") || file.name.endsWith(".jpeg")){
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
      uploadedImages.push(file)
    }


    console.log(file)

    const reader = new FileReader()

    reader.onabort = () => console.log('file reading was aborted')
    reader.onerror = () => console.log('file reading has failed')
    reader.onload = () => {
    // Do whatever you want with the file contents
      const binaryStr = reader.result
    }
    reader.readAsArrayBuffer(file)

  }

  return files;
}


function ElogNavbar(props){
  return (<Navbar bg="primary" variant="dark">
            <Nav className="mr-auto">
              <Nav.Link href="#/write-to/testing-log">Add Log Entry</Nav.Link>
              <Nav.Link href="#/view/recent-logs">Recent Logs</Nav.Link>
              <Nav.Link href="#search">Search</Nav.Link>
            </Nav>
            <Navbar.Brand href="#/write-to/testing-log">Lyncean Elog</Navbar.Brand>
          </Navbar>);
}

class Appended{
  constructor(author,date){
    this.message = "Appended on" + author + "by" + date
  }
}


let Comment = function(props){
  let text = props.text
  let caption = props.caption
  return(<figure>
            <div> {text} </div>
            <figcaption>{caption}</figcaption>
          </figure>
  );
}

let Tag = function(props){
  let tag = "Tagged with: " + props.tags
  return(<div class="italic">{tag}</div>);
}

let File = function(props){
  let path = props.path
  let name = path.substring(path.lastIndexOf('/') + 1)
  return <a href={path}> {name} </a>
}

let Stamp = function(props){
  let timestamp = props.timestamp
  let author = props.author
  return <div>{timestamp}  {author}</div>
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
    return(<div class="italic">{this.state.date.toLocaleString()}</div>);
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
