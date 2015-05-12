/* 

Copyright (c) 2015, Fabio Vitali <fabio@cs.unibo.it>

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

*/

'use strict';
var authorList = []
var app = angular.module('lancet', ['rslt', 'ui.bootstrap']);

app.controller('lancetCtrl', ['$rootScope', 'rslt', function($rootScope, rslt) {
	$rootScope.calltemplate = rslt.calltemplate
	$rootScope.byInitial = byInitial

	$rootScope.authorName ="Horrocks"
	
	$rootScope.fetch = function(data) {
		this.authorName = entities[data].foaf_familyName
		this.authorUri  = entities[data].uri
		this.calltemplate(this, 'uri','#right',true)
	}
}])

$(document).ready(function() {
	$('.authorList').height($(document).height() - (30 +  $('.navbar').height() + $('.footer').height()))
	$('.authorPapers').height($(document).height() - (30 + $('.navbar').height() + $('.footer').height()))

	$('#left').on('click','label.tree-toggler', function () {
		$(this).parent().children('ul.tree.hide').addClass('abc');
		$('ul.tree').addClass('hide');
		$(this).parent().children('ul.tree.hide.abc').removeClass('hide').removeClass('abc');
		
		$(".glyphicon-chevron-right",this).removeClass("glyphicon-chevron-right").addClass("abc")		
		$(".glyphicon-chevron-down",this).removeClass("glyphicon-chevron-down").addClass("glyphicon-chevron-right")		
		$(".abc",this).addClass("glyphicon-chevron-down").removeClass("abc")		
	})
	$( "#search" ).autocomplete({
		source: authorList,
		select: function( event, item ) { 
			$root.fetch(item.item.uri) 
		}
	});
})

function byInitial(items,prop){
	var collected = {}
	for (var i=0; i<items.length; i++){
		var item = items[i][prop]
		if ($.isArray(item)) item = item[0]
		var initial = item[0].toUpperCase()
		if (!collected[initial]) collected[initial] = []
		collected[initial].push(items[i])
	}
	return collected;
};


