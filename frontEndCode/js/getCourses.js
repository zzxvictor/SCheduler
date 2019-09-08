// Copyright 2019 Tongyu Zhu. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

"use strict";
//reserve space for add buttons for sessions and courses
const calendarButton = '<button class="open-cal">Open SCheduler</button>';
const addCourseButton = '<a><p class="course-add">Add the course</p></a>';
const rmCourseButton = '<a><p class="course-remove">Remove the course</p></a>';
const addSessionButton =
'<input type="submit" name="submit" value="Add to Scheduler" class="btn btn-add addtomycb col-xs-12 addSession"/>';
const rmSessionButton =
  '<input type="submit" name="submit" value="Remove" class="btn btn-remove addtomycb col-xs-12 removeSession"/>';
  const calendar = '<div id="calendar" class="cal"><div id="calendarHeader">Drag Me</div></div>';
var courseList;
// map of course name with classInfoObj
var unaddedSessions = {};
var addedSessions = {};

if (
  !window.location.href.includes("/myCourseBin") &&
  !window.location.href.includes("/Departments") &&  !window.location.href.includes("/Terms")
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
  // closeCal();
}

function renderCal() {
  $(document).ready(function() {
    var calendarEl = document.getElementById("calendar");
    dragCalendar();

    var calendar = new FullCalendar.Calendar(calendarEl, {
      plugins: ["interaction", "dayGrid", "timeGrid"],
      defaultView: "dayGridWeek",
      defaultDate: new Date(),
      header: {
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,timeGridDay"
      },
      events: [
        {
          title: "All Day Event",
          start: "2019-08-01"
        },
        {
          title: "Long Event",
          start: "2019-08-07",
          end: "2019-08-10"
        },
        {
          groupId: "999",
          title: "Repeating Event",
          start: "2019-08-29T16:00:00"
        },
        {
          groupId: "999",
          title: "Repeating Event",
          start: "2019-08-16T16:00:00"
        },
        {
          title: "Conference",
          start: "2019-08-11",
          end: "2019-08-13"
        },
        {
          title: "Meeting",
          start: "2019-08-12T10:30:00",
          end: "2019-08-12T12:30:00"
        },
        {
          title: "Lunch",
          start: "2019-08-12T12:00:00"
        },
        {
          title: "Meeting",
          start: "2019-08-12T14:30:00"
        },
        {
          title: "Birthday Party",
          start: "2019-08-13T07:00:00"
        },
        {
          title: "Click for Google",
          url: "http://google.com/",
          start: "2019-08-28"
        }
      ]
    });

    calendar.render();
  });

  $("body")
  .find(".run-cal")
    .click(function() {
      let data = [];
      for(let course in courseList){
        if(courseList.hasOwnProperty(course)){
          data.push(courseList[course])
        }
      }
      data = JSON.stringify(data);
      console.log(data)
      //   // ajax call to backend
    //   $.ajax({
    //     url : '',
    //     type : 'POST',
    //     data : {data},
    //     dataType:'json',
    //     success : function(data) {              
    //         alert('Data: '+data);
    //     },
    //     error : function(request,error)
    //     {
    //         alert("Request: "+JSON.stringify(request));
    //     }
    // });
    });
  }

function dragCalendar(){
  let calendarEl = document.getElementById('calendar');
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