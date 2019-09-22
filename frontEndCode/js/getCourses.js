// Copyright 2019 Tongyu Zhu. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";
//reserve space for add buttons for sessions and courses
const calendarButton = '<button class="open-cal">Open SCheduler</button>';
const requestButton = '<button class="run-cal">Request SCheduler</button>';
const addCourseButton = '<a><p class="course-add">Add the course</p></a>';
const rmCourseButton = '<a><p class="course-remove">Remove the course</p></a>';
const addSessionButton =
'<input type="submit" name="submit" value="Add to Scheduler" class="btn btn-add addtomycb col-xs-12 addSession"/>';
const rmSessionButton =
'<input type="submit" name="submit" value="Remove" class="btn btn-remove addtomycb col-xs-12 removeSession"/>';
const calendar = '<div id="calendar" class="cal"></div>';
var courseList;
var optimizedCourses;
var calendarEvents;
// map of course name with classInfoObj
var unaddedSessions = {};
var addedSessions = {};

var weekday = new Array(7);
weekday['S'] =  0;
weekday['M'] = 1;
weekday['T'] = 2;
weekday['W'] = 3;
weekday['Th'] = 4;
weekday['F'] = 5;
weekday['Sa'] = 6;

if (
  !window.location.href.includes("/myCourseBin") &&
  !window.location.href.includes("/Departments") &&  !window.location.href.includes("/Terms") &&
  !window.location.href.includes("/myKCal")
) {
  updateCourseList();
  setTimeout(() => {
    addButtons();
    updateClassInfoWithForms();
    removeClassHelper();
    addCourses();
    removeCourses();
    watchCal();
  }, 500);
}

function addButtons() {
  $("head").append(
    `<link rel="stylesheet" href="${chrome.runtime.getURL(
      "css/courses.css"
    )}" type="text/css"/>`
  );
  $("head").append(
    `<link rel="stylesheet" href="${chrome.runtime.getURL(
      "css/calCore.css"
    )}" type="text/css"/>`
  );
  $("head").append(
    `<link rel="stylesheet" href="${chrome.runtime.getURL(
      "css/calDay.css"
    )}" type="text/css"/>`
  );
  $("head").append(
    `<link rel="stylesheet" href="${chrome.runtime.getURL(
      "css/calTime.css"
    )}" type="text/css"/>`
  );
  $("head").append(
    `<script src="${chrome.runtime.getURL("js/calTime.js")}></script>`
  );
  $("head").append(
    `<script src="${chrome.runtime.getURL("js/calCore.js")}></script>`
  );
  $("head").append(
    `<script src="${chrome.runtime.getURL("js/calDay.js")}></script>`
  );
  $("head").append(
    `<script src="${chrome.runtime.getURL("js/calInteraction.js")}></script>`
  );
  /*loop through each divs to add buttons for each class.
    Classes are separated by even and odd
    */
  $("body")
    .find("h2")
    .parent()
    .append(calendarButton);
  $("body")
  .find("h2")
  .parent()
  .append(requestButton);
  $("body")
    .find("h2")
    .parent()
    .append(calendar);
  addClassButtons();
  addSessionButtons();
}

function addClassButtons() {
  $(".department-header-even").each(function() {
    $(this).append(addCourseButton);
    $(this).append(rmCourseButton);
  });
  $(".department-header-odd").each(function() {
    $(this).append(addCourseButton);
    $(this).append(rmCourseButton);
  });
}

function addSessionButtons() {
  $(".crs-accordion-content-area").each(function() {
    const session = $(this).find(".section_alt1,.section_alt0");
    session.each(function() {
      let sectionAlter;
      if ($(this).hasClass("section_alt1")) {
        sectionAlter = "alt1";
      } else {
        sectionAlter = "alt0";
      }
      let sessionStr = $(this)
        .find(`.id_${sectionAlter}`)
        .find("b")
        .html()
        .split(" ");
      const sessionId = sessionStr[0];
      const mForm = $(this).find("form");
      if (courseList.hasOwnProperty(`${sessionId}`)) {
        if (
          mForm
            .children()
            .last()
            .hasClass("btn-add")
        ) {
          mForm
            .children()
            .last()
            .remove();
        }
        if (
          !mForm
            .children()
            .last()
            .hasClass("btn-remove")
        ) {
          mForm.append(rmSessionButton);
        }
      } else {
        if (
          mForm
            .children()
            .last()
            .hasClass("btn-remove")
        ) {
          mForm
            .children()
            .last()
            .remove();
        }
        if (
          !mForm
            .children()
            .last()
            .hasClass("btn-add")
        ) {
          mForm.append(addSessionButton);
        }
      }
    });
  });
}

// watch for add sessions
function updateClassInfoWithForms() {
  //get session info for each section
  $(".btn-add").each(function() {
    const form = $(this).parents("form:first");
    const section = $(form)
      .parent()
      .siblings();
    const sectionTypeNode = $(form)
      .parent()
      .parent();
    const courseHeader = $(form)
      .parent()
      .parent()
      .parent()
      .parent()
      .prev();
    const courseTitle = courseHeader.find(".crsID").html();
    let courseName = courseTitle.replace("-", "");
    courseName = courseName.replace(":", "");
    let classes = sectionTypeNode.attr("class").split(" ");
    let sectionAlter;
    classes.forEach(className => {
      if (className.includes("alt")) sectionAlter = className.split("_")[1];
    });
    let sessionId,
      sectionType,
      units,
      regSeats,
      hours,
      days,
      instr,
      location,
      dClearance;
    //get all info with the section
    section.each(function() {
      if ($(this).hasClass(`id_${sectionAlter}`)) {
        let sessionIdStr = $(this)
          .find("b")
          .html()
          .split(" ");
        sessionId = sessionIdStr[0];
        dClearance = sessionIdStr[1];
      } else if ($(this).hasClass(`type_${sectionAlter}`)) {
        if (/^.*course-section-.*$/.test($(this).attr("class"))) {
          sectionType = $(this)
            .text()
            .split(" ")[1];
        } else {
          units = $(this)
            .text()
            .split(" ")[1];
        }
      } else if ($(this).hasClass(`regSeats_${sectionAlter}`)) {
        regSeats = $(this)
          .children()
          .last()
          .text();
      } else if ($(this).hasClass(`hours_${sectionAlter}`)) {
        hours = $(this)
          .text()
          .split(" ")[1];
      } else if ($(this).hasClass(`days_${sectionAlter}`)) {
        days = $(this)
          .text()
          .split(" ")[1];
      } else if ($(this).hasClass(`instr_${sectionAlter}`)) {
        instr = $(this)
          .text()
          .split(": ")[1];
      } else if ($(this).hasClass(`rm_${sectionAlter}`)) {
        location = $(this)
          .text()
          .split(" ")[1];
      }
    });
    let classInfoObj = {
      course: `${courseName}`,
      ID: `${sessionId}`,
      type: `${sectionType}`,
      time: `${hours}`,
      units: `${units}`,
      seats: `${regSeats}`,
      days: `${days}`,
      instr: `${instr}`,
      loc: `${location}`,
      dClearance: `${dClearance}`
    };
    // add session to unaddedSessions
    if (
      typeof unaddedSessions !== "undefined" &&
      unaddedSessions.hasOwnProperty(`${courseName}`)
    ) {
      // push to existing json array
      let hasSessions = unaddedSessions[`${courseName}`];
      hasSessions.push(classInfoObj);
      unaddedSessions[`${courseName}`] = hasSessions;
    } else {
      //insert course into unaddedSessions
      let info = [];
      info.push(classInfoObj);
      unaddedSessions[`${courseName}`] = info;
    }
    $(this).click(function(e) {
      console.log("your courses", courseList);
      // replace btn-add with btn-remove and change text
      $(this)
        .removeClass("btn-add")
        .addClass("btn-remove");
      $(this).val("Remove");
      // add class to class list
      courseList[`${sessionId}`] = classInfoObj;
      chrome.storage.sync.set({ courses: courseList });
      e.preventDefault();
      removeClassHelper();
    });
  });
}

// watch for remove sessions
function removeClassHelper() {
  $(".btn-remove").each(function() {
    const form = $(this).parents("form:first");
    const section = $(form)
      .parent()
      .parent();
    let classes = section.attr("class").split(" ");
    let sectionAlter;
    classes.forEach(className => {
      if (className.includes("alt")) sectionAlter = className.split("_")[1];
    });
    let sectionNode = section.find(`.id_${sectionAlter}`);
    let sessionIdStr = sectionNode
      .find("b")
      .html()
      .split(" ");
    let sessionId = sessionIdStr[0];
    const courseHeader = $(form)
      .parent()
      .parent()
      .parent()
      .parent()
      .prev();
    const courseTitle = courseHeader.find(".crsID").html();
    let courseName = courseTitle.replace("-", "");
    courseName = courseName.replace(":", "");
    // add session to addedSessions
    if (
      typeof addedSessions !== "undefined" &&
      addedSessions.hasOwnProperty(`${courseName}`)
    ) {
      // push to existing session ID array
      let sessionInfo = addedSessions[`${courseName}`];
      sessionInfo.push(courseList[`${sessionId}`]);
      addedSessions[`${courseName}`] = sessionInfo;
    } else {
      //insert new course with session ID
      let info = [];
      info.push(courseList[`${sessionId}`]);
      addedSessions[`${courseName}`] = info;
    }
    $(this).click(function(e) {
      //replace btn-remove with btn-add
      console.log("your courses", courseList);
      // replace btn-add with btn-remove and change text
      $(this)
        .removeClass("btn-remove")
        .addClass("btn-add");
      $(this).val("Add to Scheduler");
      //remove course from courseList and update in storage
      delete courseList[`${sessionId}`];
      chrome.storage.sync.set({ courses: courseList });
      e.preventDefault();
      updateClassInfoWithForms();
    });
  });
}

// fetch course list from chrome sync storage
function updateCourseList() {
  // try to get course list in storage
  chrome.storage.sync.get("courses", function(result) {
    //initialize map and save in storage
    if (jQuery.isEmptyObject(result)) {
      var coursesAdded = {};
      chrome.storage.sync.set({ courses: coursesAdded });
      courseList = coursesAdded;
    } else {
      courseList = result.courses;
    }
  });

  // try to get course list in storage
  chrome.storage.sync.get("optimizedCourses", function(result) {
    //initialize map and save in storage
    if (jQuery.isEmptyObject(result)) {
      var optimized = courseList;
      chrome.storage.sync.set({ optimizedCourses: optimized });
      optimizedCourses = optimized;
    } else {
      optimizedCourses = result.optimizedCourses;
    }
  });
}

function addCourses() {
  $(".course-add").each(function() {
    //get course title
    let courseTitle = $(this)
      .parent()
      .prev()
      .find(".crsID")
      .html();
    let courseName = courseTitle.replace("-", "");
    courseName = courseName.replace(":", "");
    $(this).click(function(e) {
      // move this course info from courseList
      let sessionsToAdd = unaddedSessions[`${courseName}`];
      let sessionsIn = addedSessions[`${courseName}`];
      if (!sessionsIn) sessionsIn = [];
      if (sessionsToAdd) {
        sessionsToAdd.forEach(function(session) {
          sessionsIn.push(session);
          courseList[`${session.ID}`] = session;
        });
        addedSessions[`${courseName}`] = sessionsIn;
        delete unaddedSessions[`${courseName}`];
        chrome.storage.sync.set({ courses: courseList });
        addSessionButtons();
        console.log(courseList);
        console.log(unaddedSessions);
        console.log(addedSessions);
      }
    });
  });
}

function removeCourses() {
  $(".course-remove").each(function() {
    //get course title
    let courseTitle = $(this)
      .parent()
      .prev()
      .prev()
      .find(".crsID")
      .html();
    let courseName = courseTitle.replace("-", "");
    courseName = courseName.replace(":", "");
    $(this).click(function(e) {
      // remove all sessions from courseList and addedSessions
      let sessionsToRemove = addedSessions[`${courseName}`];
      let sessionsNotAdded = unaddedSessions[`${courseName}`];
      if (!sessionsNotAdded) sessionsNotAdded = [];
      if (sessionsToRemove) {
        sessionsToRemove.forEach(function(session) {
          sessionsNotAdded.push(session);
          delete courseList[`${session.ID}`];
        });
        unaddedSessions[`${courseName}`] = sessionsNotAdded;
        delete addedSessions[`${courseName}`];
        chrome.storage.sync.set({ courses: courseList });
        addSessionButtons();
        console.log(courseList);
        console.log(unaddedSessions);
        console.log(addedSessions);
      }
    });
  });
}

function openCal(){
  $('.open-cal').each(function(){
    $(this).click(function(e){
      $(this).removeClass('open-cal');
      $(this).addClass('close-cal');
      $(this).html('Close SCheduler');
      $('#calendar').css('display','block');
      closeCal();
    })
  })
}

function closeCal(){
  $('.close-cal').each(function(){
    $(this).click(function(e){
      $(this).removeClass('close-cal');
      $(this).addClass('open-cal');
      $(this).html('Open SCheduler');
      $('#calendar').css('display','none');
      openCal();
    })
  })
}
// watch calendar activities
function watchCal(){
  renderCal();
  openCal();
}

function renderCal() {
  $(document).ready(function() {
    var calendarEl = document.getElementById("calendar");
    console.log('optimzied',optimizedCourses)
    parseCourseIntoEvents(optimizedCourses);
    var calendar = new FullCalendar.Calendar(calendarEl, {
      plugins: ["interaction", "dayGrid", "timeGrid"],
      defaultView: "timeGridWeek",
      defaultDate: new Date(),
      header: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay"
      },
      height:$(window).height()*0.20,
      events: calendarEvents,
      minTime: '08:00:00',
      maxTime: '22:00:00',
    });
    calendar.render();
    dragCalendar();
    $("body")
    .find(".run-cal")
      .click(function() {
        let data = [];
        // add constraint filter
        data['constraint'] = {};
        let constraintObj = {};
        constraintObj['avoidTime'] = [];
        constraintObj['unit'] = 18;
        data['constraint'] = constraintObj;
        data['course'] = [];
        let courseObj = data['course'];
        let courseToSessionMap = [];
        // make course to session object map
        for(let course in courseList){
          if(courseList.hasOwnProperty(course)){
            let sessionObj = courseList[course];
            let courseName = sessionObj['course'];
            let courseUnit = sessionObj['units'];
            if(!courseToSessionMap.hasOwnProperty(courseName)){
              let tempObj = [];
              tempObj.push(sessionObj);
              tempObj['unit'] = courseUnit;
              courseToSessionMap[`${courseName}`] = tempObj;
            }
            else{
              courseToSessionMap[`${courseName}`].push(sessionObj);
            }
          }
        }
        // make course format object
        for(let mCourse in courseToSessionMap){
          let session = courseToSessionMap[mCourse];
          let unit = courseToSessionMap[mCourse]['unit'];
          let name = mCourse;
          let mustHave = 'true';
          let prefer = 'true';
          let singleCourse = {};
          singleCourse['mustHave'] = mustHave;
          singleCourse['unit'] = unit;
          singleCourse['prefer'] = prefer;
          singleCourse['name'] = name;
          singleCourse['session'] = session;
          courseObj.push(singleCourse);
        }
        data['course'] = courseObj;
        console.log(data);
        // let formData = [];
        // formData['course'] = data;
        // formData['constraint'] = {};
        // formData = JSON.stringify(formData);
          // ajax call to server
        // $.ajax({
        //   url : 'http://3.14.82.97',
        //   type : 'POST',
        //   data : {data},
        //   dataType:'json',
        //   success : function(data) {              
        //       alert('Data received: '+data);
        //   },
        //   error : function(request,error)
        //   {
        //       alert("Request: "+JSON.stringify(request));
        //   }
        // });
      });
  });

}

// parse courseList into 
function parseCourseIntoEvents(list){
  calendarEvents = [];
  var curr = new Date; // get current date
  var first = curr.getDate() - curr.getDay(); // get first day of the week (Sunday)
  for(let course in list){
    if(list.hasOwnProperty(course)){
      let info = list[course];
      // get date for the events
      let days = [];
      let daysStr = info.days;
      if(daysStr.includes('M')){
        days.push(weekday['M']);
        daysStr = daysStr.slice(1);
      }
      if(daysStr.includes('T')){
        days.push(weekday['T']);
        daysStr = daysStr.slice(1);
      }
      if(daysStr.includes('W')){
        days.push(weekday['W']);
        daysStr = daysStr.slice(1);
      }
      if(daysStr.includes('Th')){
        days.push(weekday['Th']);
        daysStr = daysStr.slice(2);
      }
      if(daysStr.includes('F')){
        days.push(weekday['F']);
        daysStr = daysStr.slice(1);
      }
      let id = info.ID;
      let title = info.course;
      let duration = info.time.split('-');
      let start = duration[0];
      let end = duration[1];
      let instruct = info.instr + ' ';
      let type = info.type;

      days.forEach(function(day) {
        let currDate = new Date(curr.setDate(first+day));
        let sParts = start.match(/(\d+)\:(\d+)(\w+)/);
        let sHours = /am/i.test(sParts[3]) || sParts[1] == 12? parseInt(sParts[1]) : parseInt(sParts[1]) + 12;
        let sMinutes = parseInt(sParts[2]);
        let eParts = end.match(/(\d+)\:(\d+)(\w+)/); 
        let eHours = /am/i.test(eParts[3]) || eParts[1] == 12? parseInt(eParts[1]) : parseInt(eParts[1]) + 12;
        let eMinutes = parseInt(eParts[2]);
        let startDate = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate(), sHours, sMinutes, 0, 0)
        let endDate = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate(), eHours, eMinutes, 0, 0)
        let event = {
          id: `${id}`,
          title: `${title}`,
          start: `${startDate.toISOString()}`,
          end: `${endDate.toISOString()}`,
          overlap: true,
          allDay: false,
          description: `${instruct} + ${type}`
        }
        calendarEvents.push(event);
      });
    }
  }
}

function dragCalendar(){
  let calendarEl = document.getElementById('calendar');
  // append drag header to calendar
  $('.fc-toolbar').prepend('<div id="calendarHeader">Drag Me</div>')
  // function for dragging calendar with mouse
  if (document.getElementById('calendarHeader')) {
    /* if present, the header is where you move the DIV from:*/
    document.getElementById('calendarHeader').onmousedown = dragMouseDown;
  }
  var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  // calendarEl.onmousedown = dragMouseDown;

  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    // get the mouse cursor position at startup:
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    // call a function whenever the cursor moves:
    document.onmousemove = elementDrag;
  }

  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    // calculate the new cursor position:
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    // set the element's new position:
    calendarEl.style.top = (calendarEl.offsetTop - pos2) + "px";
    calendarEl.style.left = (calendarEl.offsetLeft - pos1) + "px";
  }

  function closeDragElement() {
    /* stop moving when mouse button is released:*/
    document.onmouseup = null;
    document.onmousemove = null;
  }
}