$(document).ready(function() 
{
    $("pre").addClass("prettyprint");
    prettyPrint();

    $("code").each(function()
    {
      var text = $(this).text();
      text = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/["]/g,"&quot;");
      var html = $(this).html();
      $(this).html( formatUnifedDiff(text, html) );
    });



});

//var diff_match_patch=require("googlediff");
diffEngine = new diff_match_patch();

function formatUnifedDiff(text, html)
{
  var wasMinus = false;
  var prevLine = null;

  var textLines = text.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
  var htmlLines = html.split(/\r\n|[\n\v\f\r\x85\u2028\u2029]/);
  var formattedLines = [];
  for( var i = 0; i < textLines.length; i++ )
  {
    var line = textLines[i];
    var htmlLine = htmlLines[i];
    if( line.indexOf("-") == 0 )
    {
      wasMinus = true;
      prevLine = line;

      if( i + 1 < textLines.length )
      {
        var nextLine = textLines[i+1];
        if( nextLine.indexOf("+") == 0)
        {
          var diffs = diffEngine.diff_main(line, nextLine);
          diffEngine.diff_cleanupSemantic(diffs);
          // there will be a difference, the "-" character, that we don't care about.
          if( diffs[0][0] == DIFF_DELETE )
            diffs[0][0] = DIFF_EQUAL;
          line = emitInnerDelDiff(diffs);
        }
      }

      formattedLines.push("<del>" + line + "</del>");
    }
    else if( line.indexOf("+") == 0  )
    {
      if( wasMinus )
      {
        var diffs = diffEngine.diff_main(prevLine, line);
        diffEngine.diff_cleanupSemantic(diffs);
        // there will be a difference, the "+" character, that we don't care about.
        if( diffs[1][0] == DIFF_INSERT )
          diffs[1][0] = DIFF_EQUAL;
        line = emitInnerDiff(diffs);
      }
      wasMinus = false;
      formattedLines.push( "<ins>" + line + "</ins>" );
    }
    else
    {
      wasMinus = false;
      formattedLines.push(htmlLine);
    }
  };

  return formattedLines.join("\n");
}

var DIFF_DELETE=-1;var DIFF_INSERT=1;var DIFF_EQUAL=0;
function emitInnerDiff(diffs)
{
  var html = [];
   for (var x = 0; x < diffs.length; x++) 
   {
     var op = diffs[x][0];    // Operation (insert, delete, equal)
     var data = diffs[x][1];  // Text of change.
     var text = data;
     switch (op) {
        case DIFF_INSERT:
          html[x] = '<ins class="inner">' + text + '</ins>';
          break;
        case DIFF_DELETE:
          break;
        case DIFF_EQUAL:
          html[x] = '' + text + '';
          break;
     }
  }
  return html.join("");
}

function emitInnerDelDiff(diffs)
{
  var html = [];
   for (var x = 0; x < diffs.length; x++) 
   {
     var op = diffs[x][0];    // Operation (insert, delete, equal)
     var data = diffs[x][1];  // Text of change.
     var text = data;
     switch (op) {
        case DIFF_INSERT:
          break;
        case DIFF_DELETE:
          html[x] = '<del class="inner">' + text + '</del>';        
          break;
        case DIFF_EQUAL:
          html[x] = '' + text + '';
          break;
     }
  }
  return html.join("");
}

