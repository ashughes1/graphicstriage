/* -*- Mode: C++; tab-width: 8; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set ts=8 sts=2 et sw=2 tw=80: */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var BIG_SCREEN = "bigscreen";
var SMALL_SCREEN = "smallscreen";

var BUGZILLA_URL;
var BUGZILLA_REST_URL;
var bugQueries;

$(document).ready(function () {
  $.getJSON('js/triage.json', function(data) {
    main(data);
  });
});

function main(triage)
{
  BUGZILLA_URL = triage.BUGZILLA_URL;
  BUGZILLA_REST_URL = triage.BUGZILLA_REST_URL;
  var display = getDisplay();
  bugQueries = triage.bugQueries;
  var count = setupQueryURLs(triage.basequery);
  displayTitle(count, "current");
  displayQueries();
  getBugCounts();
}

function getDisplay()
{
  var display = $.url().param('display');
  if (display && (display === BIG_SCREEN)) {
    return BIG_SCREEN;
  }
  return SMALL_SCREEN;
}

function displayTitle(count, displayType)
{
  //$("#title").append(" " + year);
  $("#header-bg").attr("class", "header-bg header-bg-" + displayType);
  if (displayType != "current") {
    $("#title").attr("class", "title-light");
    $("#subtitle").attr("class", "subtitle title-light");
  }

  var content = "";
  if (bugQueries) {
    for (var i = count-1; i>=0; i--) {
      content += "<div class=\"bugcount\" id=\"reportDiv-" + i + "\"></div>\n";
    }
    $("#content").replaceWith(content);
  }
}

function displayQueries()
{
  // Skip if there are no queries
  if (!bugQueries) {
    return;
  }
    
  var content = new Array();
  var next = new Date();
  if (next.getDay() == 0) next.setDate(next.getDate() - 1);
  if (next.getDay() == 6) next.setDate(next.getDate() - 1);
  
  // Set the index order
  for (var i = 0; i < bugQueries.length; i++) {
    var index = bugQueries[i].day - next.getDay();
    if (index < 0) index = index + 6;
    bugQueries[i]["index"] = index;
  }
  
  // Loop through each query to output the HTML
  for (var i = 0; i < bugQueries.length; i++) {
    var query = bugQueries[i];
    for (var j=0; j < bugQueries.length; j++) {
      if (query.index != i) query = bugQueries[j];
    }
    
    if (!("url" in query)) {
      continue;
    }
    
    // Set the next date, skipping weekend days
    next.setDate(next.getDate() + 1);
    if (next.getDay() == 6 || next.getDay() == 0) {
      next.setDate(next.getDate() + 2);
    }
    query["date"] = new Date(next.getFullYear(),next.getMonth(),next.getDate(),10,00,00);
  }
  
  for (var i = 0; i < bugQueries.length; i++) {
    // Set the datestamp and output the div for the query
    content[bugQueries[i].index] = '<div class="bugcount">'
                + '<h3>' + bugQueries[i].name + '</h3>'
                + '<div id="data' + i + '" class="data greyedout">?</div><br /><br />'
                + '<b>Next Session:</b> <br />'
                + '<a href="' + bugQueries[i].wiki + '">' + bugQueries[i].date.toDateString() + '<br />10:00am Pacific</a><br />'
                + '<iframe src="https://ashughes1.github.io/graphicstriage-metrics/index.htm#metrics-' + bugQueries[i].metrics + '" scrolling="yes" style="text-align:left; width:220px; height:220px; border:none"></iframe>'
                + '</div>';
  }
  
  // Output the content
  content = content.filter(function(value) {
    return value;
  });
  content.reverse();
  for (var i = 0; i < content.length; i++) {
    $("#reportDiv-" + i).replaceWith(content[i]);
  }
  
  var footer = '<div style="padding-left:20%; width:100%">'
    + '<iframe src="https://ashughes1.github.io/graphicstriage-metrics/index.htm#wontfix-regressions" scrolling="no" style="text-align:left; width:600px; height:300px; border:none"></iframe>'
    + '<iframe src="https://ashughes1.github.io/graphicstriage-metrics/index.htm#wontfix-regressions-new" scrolling="no" style="text-align:left; width:600px; height:300px; border:none"></iframe>'
    + '</div>';
  $("#body").append(footer);
}

function displayYearFooter(currentYear, displayType)
{
  var footer = "<div id=\"footer\" class=\"footer-" + displayType + "\">Year &gt; ";
  for (var year=currentYear; year >= 2015; year --) {
    footer += "<a href=\"?year=" + year + "\">" + year + "</a> | ";
  }
  footer += "<a href=\"?year=" + currentYear + "&future=1\">Scheduled</a>";
  footer += "</div>";
  $("#body").append(footer);
}

function setupQueryURLs(url)
{
  if (!bugQueries) {
    return 0;
  }
  for (var i = 0; i < bugQueries.length; i++) {
    bugQueries[i]["url"] = url + bugQueries[i]["params"];
  }
  return bugQueries.length;
}

function getBugCounts()
{
  if (!bugQueries) {
    return;
  }
  for (var i = 0; i < bugQueries.length; i++) {
    var bugQuery = bugQueries[i];
    if (!("url" in bugQuery)) {
      continue;
    }
    $.ajax({
      url: BUGZILLA_REST_URL + bugQuery.url + '&count_only=1',
      bugQuery: bugQuery,
      index: i,
      crossDomain:true,
      dataType: 'json',
      ifModified: true,
      success: function(data, status) {
        if (status === 'success') {
          this.bugQuery.count = data.bug_count;
          displayCount(this.index, this.bugQuery.count,
                       BUGZILLA_URL + this.bugQuery.url);
        }
      },
      error: function(jqXHR, textStatus, errorThrown) {
        alert(textStatus);
      }
    });
  }
}

function displayCount(index, count, url)
{
  $("#data" + index).replaceWith("<div class=\"data\"><a href=\"" + url
                                 + "\">" + count + "</a></div>" );
}
