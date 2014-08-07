var parts = {};
var controller;
var simultaneousScrolling = false;
var pageOffsets = { //as each book seems to be slightly off from its Diva indexes because of the notes in the beginning. No way to not hardcode this.
    '984': 4,
    '985': 2,
    '986': 2,
    '987': 2,
    '988': 2
};
var oldScrollTopYList = {};
var oldScrollTopXList = {};
var scrollTimeout;
var dragAccessedOrder = [];
var pieces = {};
var pieces2 = {};

//listener for when diva changes pages
function divaChangeListener(pageIndex, filename)
{
    controller.updateAll();
}

function updateScrollArchive()
{
    for (curPart in parts)
    {
        parts[curPart].oldScrollX = $("#diva-wrapper-" + curPart + " > .diva-outer").scrollLeft();
        parts[curPart].oldScrollY = $("#diva-wrapper-" + curPart + " > .diva-outer").scrollTop();
    }
}

function simScrollListener()
{
    //we only want the one the mouse is over currently
    if (!$(this).is(":hover"))
    {
        return;
    }

    //temporarily unbind the scroll listener
    $(".diva-outer").unbind('scroll', simScrollListener);

    //find the scrolled part and its instance
    var scrolledPart = $(this).parent().attr('id').match(/\d{3}/g)[0];
    var scrolledDivaInstance = $("#diva-wrapper-" + scrolledPart).data('diva');

    //take care of horizontal scrolling - this can be done by pixels
    var scrollDiffX = $("#diva-wrapper-" + scrolledPart + " > .diva-outer").scrollLeft() - parts[scrolledPart].oldScrollX;

    if (scrollDiffX !== 0)
    {
        controller.scrollHorizontalBy(scrolledPart, scrollDiffX);
    }

    //get page array and figure out where the initial indices for this composition and the next one are
    var tempCurrent = controller.getCurrent();
    var partPageArr = parts[scrolledPart].pagesFor(tempCurrent);
    
    //if the composition doesn't exist on that part, scroll by pixels
    if (!partPageArr)
    {
        var scrollDiffY = $("#diva-wrapper-" + scrolledPart + " > .diva-outer").scrollTop() - parts[scrolledPart].oldScrollY;

        controller.scrollVerticalBy(scrolledPart, scrollDiffY);
    }
    //else: work by percents
    else 
    {
        var startIndex = partPageArr[0];
        var endIndex = partPageArr[partPageArr.length - 1] + 1;

        //grab height array for current page and calculate the percentage into the current piece
        var heightArr = scrolledDivaInstance.getSettings().heightAbovePages;
        var heightDiff = heightArr[endIndex] - heightArr[startIndex];

        var percent = ($("#diva-wrapper-" + scrolledPart + "> .diva-outer").scrollTop() - heightArr[startIndex]) / heightDiff;

        //change the current position, passing in undefined as the diva listener is called before this; currentComposition will always be up to date
        controller.safelyChangePosition(scrolledPart, undefined, percent); 
            console.log('here1');
    }

            console.log('here2');
    updateScrollArchive();
            console.log('here3');
    $(".diva-outer").on('scroll', simScrollListener);
}

function updateStackWith(which)
{
    var indexHold = dragAccessedOrder.indexOf(which);
    var newOrder = [];

    for (var x = 0; x < 6; x++)
    {
        if(x !== indexHold)
        {
            newOrder.push(dragAccessedOrder[x]);
        }
    }

    newOrder.push(dragAccessedOrder[indexHold]);

    dragAccessedOrder = newOrder;

    for (var x = 0; x < 6; x++)
    {
        $("#" + dragAccessedOrder[x]).css('z-index', x + 2);
    }
}

function Part(div, num, data)
{
    var partbookNum = num;
    var offset = pageOffsets[partbookNum];
    var partbookData = data;
    var divaElement = $(div);
    this.oldScrollX;
    this.oldScrollY;

    divaElement.diva({
        adaptivePadding: 0,
        enableAutoHeight: false,
        enableAutoTitle: true,
        enableAutoWidth: false,   
        enableCanvas: false,        
        enableDownload: false,
        enableFullscreen: false,
        enableGridIcon: false,
        enableLinkIcon: false,
        fixedHeightGrid: false,
        iipServerURL: "http://diva.simssa.ca/fcgi-bin/iipsrv.fcgi",
        objectData: "json/" + num + ".json",
        imageDir: "/srv/images/dow_partbooks/" + num,
        viewerWidthPadding: 0,
        viewerHeightPadding: 0,
        zoomLevel: 2
    });

    //changes currently visible page
    this.changeComp = function(compositionID)
    {
        console.log("changeComp for", partbookNum);
        //get the initial page index for the composition ID, add the amount of pages that Diva/DIAMM add
        var pageIndex = partbookData[compositionID][0] + offset;
        //change to the correct page
        divaElement.data('diva').gotoPageByIndex(pageIndex);
    };

    //scrolls currently visible page to a different position down the page
    this.changeCompPartial = function(compositionID, percent)
    {
        console.log("changeCompPartial for", partbookNum);
        //grab the heightAbovePages array and array of page indices
        var heightArr = divaElement.data('diva').getSettings().heightAbovePages;
        var pagesArr = this.pagesFor(compositionID);

        //get the top pixel values for the first page and the page after the last
        var firstPageHeight = heightArr[pagesArr[0]];
        var lastPageHeight = heightArr[pagesArr[pagesArr.length - 1] + 1];

        //scroll to the percentage
        var newTop = firstPageHeight + ((lastPageHeight - firstPageHeight) * parseFloat(percent));
        divaElement.children(".diva-outer").scrollTop(newTop);
        this.updateComposition();
    };

    this.scrollVertical = function(diff)
    {
        divaElement.children(".diva-outer").scrollTop(divaElement.children(".diva-outer").scrollTop() + diff);
        this.updateComposition();
    };

    this.scrollHorizontal = function(diff)
    {
        divaElement.children(".diva-outer").scrollLeft(divaElement.children(".diva-outer").scrollLeft() + diff);
    };

    this.updateComposition = function()
    {
        console.log(partbookNum, divaElement.data('diva').getCurrentPageIndex());
        var comp = this.getComposition(divaElement.data('diva').getCurrentPageIndex());
        $("#" + partbookNum + "-content").text(pieces2[comp]);
    };

    //gets the composition active at a given page number
    this.getComposition = function(pageNum)
    {
        //gets the diva index in, subtracts the diva/DIAMM offset
        var adaptedPageNum = Math.max(pageNum - offset, 0);
        //iterates through partbook data
        for (curComposition in partbookData)
        {
            //return the first composition on that page
            if (partbookData[curComposition].indexOf(adaptedPageNum) > -1)
            {
                return curComposition;
            }
        }
        return false;
    };

    this.pagesFor = function(composition)
    {
        if (partbookData[composition])
        {
            return partbookData[composition].map(function(el){
                return (el + offset);
            });
        }
        else
        {
            return undefined;
        }
    };
}

//Manages a collection of parts
function PartsController(partArr)
{
    var parts = partArr;
    var currentComposition;
    var percent;
    var selectSkip;
    var lastChanged;

    //realign all parts to the currently stored specific point on the pages
    this.realignPages = function()
    {
        console.log("realign");
        if (percent == undefined)
        {
            for (curPart in parts){
                if (parts[curPart].pagesFor(currentComposition) !== undefined && (curPart != lastChanged))
                {
                    //if there is no currently store percentage, move to the currently stored page
                    parts[curPart].changeComp(currentComposition);
                }
            }           
        }
        else 
        {
            for (curPart in parts){
                if (parts[curPart].pagesFor(currentComposition) !== undefined && (curPart != lastChanged))
                {
                    //else do changeCompPartial
                    parts[curPart].changeCompPartial(currentComposition, percent);
                }
            }
        }

        /*if($("#piece-"+currentComposition).length == 1)
        {
            $("#piece-" + currentComposition).attr('selected', 'selected');
        }
        else
        {
            $("#piece-default").attr('selected', 'selected');
        }*/

    };

    //returns the current composition in classic Java syntax
    this.getCurrent = function()
    {
        return currentComposition;
    };

    this.safelyChangeOnePosition = function(partbookNum, newComposition)
    {
        parts[partbookNum].updateComposition(newComposition);
    };

    //updates lastChanged and/or currentComposition and/or percent, all "safely" by not immediately overwriting
    this.safelyChangePosition = function(lastChangedIn, newComposition, percentIn)
    {
        lastChanged = (lastChangedIn === undefined ? undefined : lastChangedIn);

        //six options here: percent is valid or undefined, newComp is changed, unchanged, or undefined
        //if newComp changed ("false" is acceptable as a possible value)
        if (newComposition !== undefined && (newComposition != currentComposition))
        {
            currentComposition = newComposition;
            //either percent option
            percent = (percentIn === undefined ? 0 : percentIn);
        }
        //if percent is undefined and comp didn't change or is undefined, reset percent to undefined so we know to change by full page
        else if (percentIn === undefined)
        {
            percent = percentIn;
            return false;
        }
        //otherwise percent exists and we should change it, but nothing will change with curComp
        else if (percentIn !== undefined)
        {
            percent = percentIn;
        }

        //trigger realign
        this.realignPages();
        console.log("out safe");
        return true;
    };

    //scrolls everything by "diff" pixels; does not do lastChanged
    this.scrollVerticalBy = function(lastChangedIn, diff)
    {
        lastChanged = (lastChangedIn === undefined ? undefined : lastChangedIn);

        for (curPart in parts)
        {
            if (curPart != lastChanged)
            {
                parts[curPart].scrollVertical(diff);
            }
        }
    };

    //scrolls everything by "diff" pixels; does not do lastChanged
    this.scrollHorizontalBy = function(lastChangedIn, diff)
    {
        lastChanged = (lastChangedIn === undefined ? undefined : lastChangedIn);

        for (curPart in parts)
        {
            if (curPart != lastChanged)
            {
                parts[curPart].scrollHorizontal(diff);
            }
        }
    };

    //zooms every part in by 1
    this.zoomInAll = function()
    {
        for (curPart in parts)
        {
            $("#diva-wrapper-" + curPart).data('diva').zoomIn();
        }
    };

    //zooms every part out by 1
    this.zoomOutAll = function()
    {
        for (curPart in parts)
        {
            $("#diva-wrapper-" + curPart).data('diva').zoomOut();
        }
    };

    //returns all to zoom level 2
    this.defaultZoomAll = function()
    {
        for (curPart in parts)
        {
            $("#diva-wrapper-" + curPart).data('diva').setZoomLevel(2);
        }
    };

    //horizontally centers all parts
    this.horizCenterAll = function()
    {
        for (curPart in parts)
        {
            var wrapperWidth = $("#diva-wrapper-" + curPart).width();
            var outerWidth = $("#diva-wrapper-" + curPart).children(".diva-outer").children(".diva-inner").width();
            var centeredLeft = (outerWidth - wrapperWidth) / 2;
            $("#diva-wrapper-" + curPart).children(".diva-outer").scrollLeft(centeredLeft);
        }
    };

    this.updateAll = function()
    {
        for (curPart in parts)
        {
            parts[curPart].updateComposition();
        }
    };
}

$(document).ready(function() 
{        
    //control panel is draggable
    $(".control-panel").draggable({
        containment: "window",
        start: function(e, ui)
        {
            updateStackWith(ui.helper.parent().attr('id'));
        }
    });

    $("#toggleCPanel").on('click', function(){
        $("#control-panel-content").toggle();
        $("#toggleCPanel").text(($("#control-panel-content").css('display') == "none" ? "Maximize" : "Minimize"));
    });

    $("#toggleScrolling").on('click', function(){
        if(simultaneousScrolling)
        {
            $(".diva-outer").unbind('scroll', simScrollListener);
            simultaneousScrolling = false;
            $("#toggleScrolling").text("Turn on simultaneous scrolling");
        }
        else
        {
            updateScrollArchive();
            $(".diva-outer").on('scroll', simScrollListener);
            simultaneousScrolling = true;
            $("#toggleScrolling").text("Turn off simultaneous scrolling");
        }
    });

    //get the partbook data file
    $.ajax(
    {
        url: 'partbooks.json',
        cache: true,
        dataType: 'json',
        success: function (data, status, jqxhr)
        {
            //parsing
            pieces = data['pieces'];
            pieces2 = data['debugPieces'];
            
            //fill the select
            for(curIndex in pieces)
            {
                var curID = pieces[curIndex][0];
                var curTitle = pieces[curIndex][1];
                $("#compositionSelect").append("<option id='piece-" + curID + "' pieceid='" + curID + "'>" + curTitle + "</option>");
            }

            //on-change listener to jump to pieces
            $("#compositionSelect").on('change', function(e){
                console.log("change called");
                //temporarily unbind the scroll listener
                //diva.Events.unsubscribe(divaChangeHandle);
                if(simultaneousScrolling)
                {
                    $(".diva-outer").unbind('scroll', simScrollListener);
                }

                var newPiece = $(e.target).find(":selected");
                newComposition = newPiece.attr('pieceid');

                controller.safelyChangePosition(undefined, newComposition);

                if(simultaneousScrolling)
                {
                    $(".diva-outer").on('scroll', simScrollListener);
                }
                //divaChangeHandle = diva.Events.subscribe('VisiblePageDidChange', divaChangeListener);
            });

            //create parts
            for(curKey in data['csvData'])
            {
                $("body").append("<div id='diva-wrapper-" + curKey + "' class='diva-wrapper'></div>");
                parts[curKey] = (new Part('#diva-wrapper-' + curKey, curKey, data['csvData'][curKey]));
                controller = new PartsController(parts);
            }

            $("#zoomInAll").on('click', controller.zoomInAll);

            $("#zoomOutAll").on('click', controller.zoomOutAll);

            $("#defaultZoomAll").on('click', controller.defaultZoomAll);

            $("#horizCenterAll").on('click', controller.horizCenterAll);

            var loadedCount = 0;
            diva.Events.subscribe('ViewerDidLoad', function()
            {
                loadedCount += 1;
                //once all five divas have loaded
                if (loadedCount == $('.diva-wrapper').length)
                {
                    //add minimize buttons in place of zoom labels
                    $('.diva-tools-left').append("<br><button class='minimizer'>Minimize</button>");
                    $('.diva-buttons-label').css('display', 'none');
                    $('.diva-page-label').before('<br>');

                    curTitleIndex = $(".diva-title").length;
                    while (curTitleIndex--)
                    {
                        var curTitle = $($(".diva-title")[curTitleIndex]);
                        var curKey = curTitle.parent().attr('id').match(/\d{3}/g);
                        var target = $(curTitle.parent().children(".diva-tools").children(".diva-tools-right"));
                        curTitle.insertBefore(target);

                        $("#current-pieces").prepend("<div class='part-info' id='" + curKey + "-info'>" +
                                curTitle.text() + ": " +
                                "<span id='" + curKey + "-content'>---</span>" +
                            "</div>");
                    }

                    $(".diva-tools > .diva-tools-left").css('z-index', 2);
                    $(".diva-tools > .diva-tools-right").css('z-index', 2);
                    $(".diva-tools > .diva-title").css('z-index', 0);

                    $('.minimizer').on('click', function(e)
                    {
                        //when minimize is clicked
                        var wrapperParent = $(e.target).closest('.diva-wrapper');
                        wrapperParent.hide();
                        //get the id of the partbook
                        var bookTitle = wrapperParent.attr('id').match(/\d{3}/g);
                        //add a way to maximize it to the control panel
                        $("#minimized-objects").append("<span id='maximize-" + bookTitle + "' class='maximize-wrapper'>" + bookTitle + "<button class='maximizer'>Maximize</button></span>");

                        //when that is clicked
                        $('.maximizer').on('click', function(e)
                        {
                            //get the ID and maximize
                            var maximizeParent = $(e.target).closest('.maximize-wrapper');
                            var bookTitle = maximizeParent.attr('id').match(/\d{3}/g);
                            maximizeParent.remove();
                            $("#diva-wrapper-" + bookTitle).show();
                        });
                    });

                    //make draggable
                    $('.diva-wrapper').draggable({
                        containment: "parent",
                        start: function(e, ui)
                        {
                            updateStackWith(ui.helper.attr('id'));
                        }
                    });

                    dragAccessedOrder.push($($('.control-panel-container')[0]).attr('id'));

                    var curDiva = $('.diva-wrapper').length;
                    while (curDiva--)
                    {
                        dragAccessedOrder.push($($('.diva-wrapper')[curDiva]).attr('id'));
                    }

                    //subscribe after everything so this doesn't get called accidentally
                    divaChangeHandle = diva.Events.subscribe('VisiblePageDidChange', divaChangeListener);
                }
            });
        }
    });
});