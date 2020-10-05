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
import { createPopper } from '@popperjs/core/lib/createPopper';
import { auto } from '@popperjs/core';

let buttonId = 0
let iter = 0
let last=-1
let files = []
let shownFiles = []
let uploadedImages = []
let alerts = [<Alert key={1} variant="success">Success</Alert>,<Alert key={2} variant="warning">Warning, changes may have not gone through!</Alert>]
const list_of_logs = ["testing", "operations", "custom"]
let lastUrl = ""
let testing_config_entered = true;

//THESE ARE TEMPORARY AND SHOULD BE REMOVED WHEN APP INTEGRATED IN FLASK SERVER
let glob_config = "High Power RF Test"
let glob_comp = ["Structures","Loads"]
let glob_nums = ["#,#,#,#","#,#,#,#"]

let glob_entries = []

let glob_user = "operator"

let glob_log = "Testing Log 09/28/20"

let test_log = "Example"
//


function App() {
  let endOfUrl = window.location.href.indexOf("#")
  let currUrl = window.location.href.slice(endOfUrl)
  lastUrl = currUrl
  const element = <h1></h1>;
  switch(currUrl){
    case "#/write-to/testing-log":
      return(<AddLogEntry log={"testing"}/>);
    case "#/write-to/operations-log":
      return(<AddLogEntry log={"operations"}/>);
    case "#/view/recent-logs":
      return(<RecentLogs/>);
      break;
    case "#/view/recent-logs/demo":
      return(<Demo/>);
      break;
    default:
      window.location.href = "#/write-to/testing-log"
      window.location.reload(false);
  }
}

function Post(props){
    return(<Container>
            <Row><div class="italic-large">Posted at 09:39 by operator</div></Row>
            <Row>
              <Col xs={12}>
                <File path={props.file}/>
                <Comment text={props.comment}/>
              </Col>
            </Row>
           </Container>);
};

function Demo(){
  let test = (<Post file="pics" comment="Rack temperatures"/>);

  function handleChange(){
    window.location.href = "#/view/recent-logs"
    window.location.reload(false);
  }

  function saveAsPdf(){

  }

  let text = testingConfigToTable("Rod L",glob_config,glob_comp,glob_nums,true)

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
                <Card style={{ width: '80rem' }}>
                  <Card.Body>
                    <Card.Title>{glob_log}</Card.Title>
                    <Card.Subtitle className="mb-2 text-muted">First Entry: 09/28/20 09:00 PST</Card.Subtitle>
                    <Card.Subtitle className="mb-2 text-muted">Last Entry: 09/28/20 09:00 PST</Card.Subtitle>
                    <ListGroup className="list-group-flush">
                      <ListGroupItem>
                        {text}
                      </ListGroupItem>
                      <ListGroupItem>
                        {test}
                      </ListGroupItem>
                    </ListGroup>
                    <Card.Link href="#">Previous Day's Log</Card.Link>
                    <Card.Link href="#">Next Day's Log</Card.Link>
                  </Card.Body>
                </Card>
              </Row>
            </Container>
          </Col>
        </Row>
      </Container>
    </div>);
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
            <LogViewer/>
          </Col>
        </Row>
      </Container>
    </div>
  );
}


function tick(){
  let endOfUrl = window.location.href.indexOf("#")
  let currUrl = window.location.href.slice(endOfUrl)
  if(lastUrl!=currUrl){
    const element = <h1></h1>;
    switch(currUrl){
      case "#/write-to/testing-log":
        ReactDOM.render(<AddLogEntry log={"testing"}/>, document.getElementById('root'));
        console.log('HEY')
        //window.location.reload(false);
        break;
      case "#/write-to/operations-log":
        ReactDOM.render(<AddLogEntry log={"operations"}/>, document.getElementById('root'));
        console.log('HEY')
        //window.location.reload(false);
        break;
      case "#/view/recent-logs":
        ReactDOM.render(<RecentLogs log={"operations"}/>, document.getElementById('root'));
        console.log('wat')
        //window.location.reload(false);
        break;
      default:
        ReactDOM.render(element, document.getElementById('root'));
        window.location.reload(false);
    }
  }
}

setInterval(tick, 100);

function header_exists(log){
  console.log(testing_config_entered)
  if(testing_config_entered==false){
    return false;
  }
  if(glob_comp.length>0){
    return true;
  };
  return false;
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

class WriteToLog extends React.Component{
  constructor(props){
    super(props)
    this.state = {log:props.log}
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
          <Col xs={4}><AutosaveLog value={'1'}/></Col>
          <Col xs={4}><ManualSave/></Col>
        </Row>
        {this.form}
      </Container>
    );
  }

  render(){
    return this.element
  }
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
      let checked = [event.target.checked0.checked,event.target.checked1.checked,event.target.checked2.checked,event.target.checked3.checked,event.target.checked4.checked]
      let components = [event.target.component0.value, event.target.component1.value, event.target.component2.value, event.target.component3.value, event.target.component4.value]
      let numbers = [event.target.number0.value, event.target.number1.value, event.target.number2.value, event.target.number3.value, event.target.number4.value]
      for(;i<5;i++){
        if(checked[i]){
          //glob_comp.push(components[i])
          //glob_nums.push(numbers[i])
        }
      }
      testing_config_entered=true
      ReactDOM.render(<AddLogEntry log={"testing"}/>, document.getElementById('root'));
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


class LogViewer extends React.Component{
  constructor(props){
    super(props)
    this.menu = (<LogMenu/>);
  }

  render(){
    return this.menu;
  }
}

function LogMenu(props){

  let text = testingConfigToTable("Rod L",glob_config,glob_comp,glob_nums,false)
  let title = glob_log
  let id = "0"

  let items = []

  let example = (<div>Header entry shown here.</div>);

  items.push(<LogCard text={text} title={title} id={id} updated="today"/>);
  items.push(<LogCard text={example} title="Title of Log Shown Here" id="demo" updated="today"/>);

  return(<CardGroup>{items}</CardGroup>);
  //glob_log = title
  //glob_user
  //glob_comp.push(components(STR))
  //glob_nums.push(numbers(STR))
  //glob_entries.push((glob_user(STR),files(LIST OF STR),event.target.comment.value(STR)))
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
      <Card.Link href={"#/view/recent-logs/demo"}>View Log</Card.Link>
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
  if(success=true){
    render(<Alert id="success" variant="success" dismissible>Success</Alert>,document.getElementById('empty'));
    setTimeout(() => {   render(<div/>,document.getElementById('empty')); }, 3000);
  }
  if(success=false){
    render(<Alert id="success" variant="warning" dismissible>Warning! Something went wrong!</Alert>,document.getElementById('empty'));
    setTimeout(() => {   render(<div/>,document.getElementById('empty')); }, 3000);
  }
}


function AppendForm(props) {
  const [validated, setValidated] = useState(false);
  let files = props.oldFiles
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
      glob_entries.push((glob_user,files,event.target.comment.value))
      files = []
      form.reset()
      console.log(files)
      sendAlert(true)
    }
  };

  return (
    <div>
    <Form noValidate validated={validated} onSubmit={handleSubmit}>
      <FileDrop oldFiles={[]} />
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

function AutosaveLog(props) {
  const [checked, setChecked] = useState(false);
  const [radioValue, setRadioValue] = useState(props.value);

  const radios = [
    { name: 'On', value: '1' },
    { name: 'Off', value: '0' },
  ];

  function changeAutoSave(val){
    console.log(val)
    if(val==0 || val==1){
      setRadioValue(val)
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
    console.log('manual save button bressed')
  }

  render(){
    return(
      <Button variant="light" onClick={() => this.handleChange()}>Manually Commit Log</Button>
    );
  }
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
    files.push(file);
    shownFiles.push(file)
    if(file.name.endsWith(".jpg") || file.name.endsWith(".png") || file.name.endsWith(".jpeg")){
      Object.assign(file, {
        preview: URL.createObjectURL(file)
      })
      uploadedImages.push(file)
    }
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
