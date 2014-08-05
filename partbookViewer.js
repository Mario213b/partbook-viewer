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
        //unhook the diva event so it doesn't get called again
        diva.Events.unsubscribe(divaChangeHandle);
        //get the initial page index for the composition ID, add the amount of pages that Diva/DIAMM add
        var pageIndex = partbookData[compositionID][0] + offset;
        //change to the correct page
        divaElement.data('diva').gotoPageByIndex(pageIndex);
        //turn the diva event back on
        divaChangeHandle = diva.Events.subscribe('VisiblePageDidChange', divaChangeListener);
    };

    //scrolls currently visible page to a different position down the page
    this.changeCompPartial = function(compositionID, percent)
    {
        diva.Events.unsubscribe(divaChangeHandle);
        //grab the heightAbovePages array and array of page indices
        var heightArr = divaElement.data('diva').getSettings().heightAbovePages;
        var pagesArr = this.pagesFor(compositionID);

        //get the heights of the first and last pages
        var firstPageHeight = heightArr[pagesArr[0]];
        var lastPageHeight = heightArr[pagesArr[pagesArr.length - 1]];

        //scroll to the percentage
        var newTop = firstPageHeight + ((lastPageHeight - firstPageHeight) * parseFloat(percent));
        divaElement.children(".diva-outer").scrollTop(newTop);
        divaChangeHandle = diva.Events.subscribe('VisiblePageDidChange', divaChangeListener);
    };

    this.scrollVertical = function(diff)
    {
        diva.Events.unsubscribe(divaChangeHandle);
        divaElement.children(".diva-outer").scrollTop(divaElement.children(".diva-outer").scrollTop() + diff);
        divaChangeHandle = diva.Events.subscribe('VisiblePageDidChange', divaChangeListener);
    };

    this.scrollHorizontal = function(diff)
    {
        diva.Events.unsubscribe(divaChangeHandle);
        divaElement.children(".diva-outer").scrollLeft(divaElement.children(".diva-outer").scrollLeft() + diff);
        divaChangeHandle = diva.Events.subscribe('VisiblePageDidChange', divaChangeListener);
    };

    //gets the composition active at a given page number
    this.getComposition = function(pageNum)
    {
        //gets the diva index in, subtracts the diva/DIAMM offset
        var adaptedPageNum = Math.max(pageNum - offset, 0);
        //iterates through partbook data
        for(curComposition in partbookData)
        {
            //return the first composition on that page
            if(partbookData[curComposition].indexOf(adaptedPageNum) > -1)
            {
                return curComposition;
            }
        }
        return false;
    };

    this.pagesFor = function(composition)
    {
        if(partbookData[composition])
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
        if(percent == undefined)
        {
            for(curPart in parts){
                if(parts[curPart].pagesFor(currentComposition) !== undefined && (curPart != lastChanged))
                {
                    //if there is no currently store percentage, move to the currently stored page
                    parts[curPart].changeComp(currentComposition);
                }
            }           
        }
        else 
        {
            for(curPart in parts){
                if(parts[curPart].pagesFor(currentComposition) !== undefined && (curPart != lastChanged))
                {
                    //else do changeCompPartial
                    parts[curPart].changeCompPartial(currentComposition, percent);
                }
            }
        }

        if($("#piece-"+currentComposition).length == 1)
        {
            $("#piece-" + currentComposition).attr('selected', 'selected');
        }
        else
        {
            $("#piece-default").attr('selected', 'selected');
        }

    };

    //returns the current composition in classic Java syntax
    this.getCurrent = function()
    {
        return currentComposition;
    };

    //updates lastChanged and/or currentComposition and/or percent, all "safely" by not immediately overwriting
    this.safelyChangePosition = function(lastChangedIn, newComposition, percentIn)
    {
        lastChanged = (lastChangedIn === undefined ? undefined : lastChangedIn);

        //six options here: percent is valid or undefined, newComp is changed, unchanged, or undefined
        //if newComp changed ("false" is acceptable as a possible value)
        if(newComposition !== undefined && (newComposition != currentComposition))
        {
            currentComposition = newComposition;
            //either percent option
            percent = (percentIn === undefined ? 0 : percentIn);
        }

        //if percent is undefined and comp didn't change or is undefined, nothing changes
        else if(percentIn === undefined)
        {
            return false;
        }

        //otherwise percent exists and we should change it, but nothing will change with curComp
        else if(percentIn !== undefined)
        {
            percent = percentIn;
        }

        //trigger realign
        this.realignPages();
        return true;
    };

    this.scrollVerticalBy = function(lastChangedIn, diff)
    {
        lastChanged = (lastChangedIn === undefined ? undefined : lastChangedIn);

        for(curPart in parts)
        {
            if(curPart != lastChanged)
            {
                parts[curPart].scrollVertical(diff);
            }
        }
    };

    this.scrollHorizontalBy = function(lastChangedIn, diff)
    {
        lastChanged = (lastChangedIn === undefined ? undefined : lastChangedIn);

        for(curPart in parts)
        {
            if(curPart != lastChanged)
            {
                parts[curPart].scrollHorizontal(diff);
            }
        }
    };

}

//listener for when diva changes pages
function divaChangeListener(pageIndex, filename)
{
    //as there's one central diva events listener, get the partbook ID from where we were hovering
    var partbookNum;

    for(curDiva in $(".diva-wrapper"))
    {
        if($($(".diva-wrapper")[curDiva]).is(":hover"))
        {
            partbookNum = $($(".diva-wrapper")[curDiva]).attr('id').match(/\d{3}/g);
            break;
        }
    }

    //temporary workaround while the one diva events listener is still nonfunctional - the filename will match the hovered partbookNum if we want it to count
    if(!filename.match(partbookNum))
    {
        return;
    }

    var newComposition = parts[partbookNum].getComposition(pageIndex);
    controller.safelyChangePosition(partbookNum, newComposition);
}

function updateScrollArchive()
{
    for(curPart in parts)
    {
        parts[curPart].oldScrollX = $("#diva-wrapper-" + curPart + " > .diva-outer").scrollLeft();
        parts[curPart].oldScrollY = $("#diva-wrapper-" + curPart + " > .diva-outer").scrollTop();
    }
}

function simScrollListener()
{
    //we only want the one the mouse is over currently
    if(!$(this).is(":hover"))
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

    if(scrollDiffX !== 0)
    {
        console.log(scrollDiffX);
        controller.scrollHorizontalBy(scrolledPart, scrollDiffX);
    }

    //get page array and figure out where the initial indices for this composition and the next one are
    var tempCurrent = controller.getCurrent();
    var partPageArr = parts[scrolledPart].pagesFor(tempCurrent);
    
    //if the composition doesn't exist on that part, scroll by pixels
    if(!partPageArr)
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
    }

    updateScrollArchive();
    $(".diva-outer").on('scroll', simScrollListener);
}

$(document).ready(function() 
{
    //control panel is draggable and minimizable
    $(".control-panel").draggable({});
    $("#toggleCPanel").on('click', function(){
        $("#cPanelContent").toggle();
        $("#toggleCPanel").text(($("#cPanelContent").css('display') == "none" ? "Maximize" : "Minimize"));
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
                //temporarily unbind the scroll listener
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
            });

            //create parts
            for(curKey in data['csvData'])
            {
                $("body").append("<div id='diva-wrapper-" + curKey + "' class='diva-wrapper'></div>");
                parts[curKey] = (new Part('#diva-wrapper-' + curKey, curKey, data['csvData'][curKey]));
                controller = new PartsController(parts);
            }

            var loadedCount = 0;
            diva.Events.subscribe('ViewerDidLoad', function()
            {
                loadedCount += 1;
                //once all five divas have loaded
                if(loadedCount == $('.diva-wrapper').length)
                {
                    //add minimize buttons in place of zoom labels
                    $('.diva-tools-left').append("<br><button class='minimizer'>Minimize</button>");
                    $('.diva-buttons-label').css('display', 'none');
                    $('.diva-page-label').before('<br>');

                    curTitleIndex = $(".diva-title").length;
                    while(curTitleIndex--)
                    {
                        var curTitle = $($(".diva-title")[curTitleIndex]);
                        var target = $(curTitle.parent().children(".diva-tools").children(".diva-tools-right"));
                        curTitle.insertBefore(target);
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
                        start: function(e, ui)
                        {
                            $('.diva-wrapper').css('z-index', 2);
                            ui.helper.css('z-index', 3);
                        }
                    });

                    //subscribe after everything so this doesn't get called accidentally
                    divaChangeHandle = diva.Events.subscribe('VisiblePageDidChange', divaChangeListener);
                }
            });
        }
    });
});