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
if (!finalQueries) 
	var finalQueries = []

	Object.defineProperty(Object.prototype, "getClassName", { 
		value: function() {
			return ( this.constructor && this.constructor.name) || 'Object'
		},
		enumerable : false
	});

	Object.defineProperty(Object.prototype, "merge", { 
		value: function(o) {
			for (var attrname in o) 
				if (o.hasOwnProperty(attrname) )
					this[attrname] = o[attrname]; 
		},
		enumerable : false
	});
	
	Object.defineProperty(Object.prototype, "getKeyByValue", { 
		value: function(value, f) {
			if (!f) {
				f = function(a,b) { return a === b }
			}
			for( var prop in this ) {
				if( this.hasOwnProperty( prop ) ) {
					 if( f.apply(this,[this[ prop ], value]) )
						 return prop;
				}
			}
		},
		enumerable : false
	});

	Object.defineProperty(Array.prototype, "getItemByKeyValue", { 
		value: function(key, value, f) {
			if (!f) {
				f = function(a,b) { return a === b }
			}
			for( var i=0; i<this.length; i++ ) {
				if( f.apply(this,[this[i][key], value ]) )
						return this[i];
			}
		},
		enumerable : false
	});

	String.prototype.hashCode = function(){
		return this.split("").reduce(function(a,b){a=((a<<5)-a)+b.charCodeAt(0);return a&a},0);              
	}

	String.prototype.trim = function() {
		return this.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
	}
	
	String.prototype.replaceVars = function(o) { 
		var r = this ; 
		for (var i in o) { 
			r = r.replace(new RegExp("\\$"+i, 'g'),o[i]) 
		} 
		return r 
	}

	String.prototype.hashCode = function() {
		var hash = 0, i, chr, len;
		if (this.length == 0) return hash;
		for (i = 0, len = this.length; i < len; i++) {
			chr   = this.charCodeAt(i);
			hash  = ((hash << 5) - hash) + chr;
			hash |= 0; // Convert to 32bit integer
		}
		return hash;
	};

	function Entity() {	}
	
	Entity.prototype.append = function(term,definition) {
		var me = this
		var doAppend = function(t,definition) {
//			if (!me['#sort']) me['#sort']=[]
			var term = prefixes.toUnderscore(t)
			if (!me[term])  {
				me[term] = definition
//				me['#sort'].push(term)
			} else if ( me[term] != definition ){
				if (!(me[term] instanceof Array))
					me[term] = [me[term]]
				if (definition && me[term].indexOf(definition) == -1 )
					me[term].push(definition)
			}
		
		}
		if (term instanceof Array) {
			for (var i= 0; i<term.length; i++) 
				me.append(term[i])
		} else if (term instanceof Object) {
			var k = Object.keys(term)
			for (var i=0; i<k.length; i++) {
				me.append(k[i], term[k[i]])
			}
		} else if (definition || definition==='') {
			doAppend(term, definition)
		} else {
			var bits = me.parse(term)
			me.append(bits)
		}
			
	}
	Entity.prototype.parse = function(str) {
		var ret = []
		var bits = str.split(/\s+/)
		for (var i=0; i<bits.length; i+=2) {
			var o = {}
			o[bits[i]] = bits[i+1]
			ret.push(o)
		}
		return ret
	}	
	Entity.prototype.match = function(thing,data) {
		var priority = 0
		var mode =(data&&data.mode)?"("+data.mode+") ":""
		if (thing=='$start') {
			return this['$start']
		} else if (thing && thing.uri) {
			var matches = [this.defaultEntityTemplate]

			var facts = [mode+thing.uri]
			
			var types = thing['rdf_type']
			if (angular.isArray(types)) {
				for (var i=0; i<types.length; i++) {
					facts.push(mode+'xxx -> ' + types[i])
				}
			} else {
				facts.push(mode+'xxx -> ' + types)
			}
			for (var i in thing) if (i[0]=='<') {
				facts.push(mode+'xxx '+ i +' '+thing[i])
			}
		} else {
			if (thing.o.indexOf('<http://') == 0 ) 
				var matches = [this.defaultObjectPredicateTemplate]
			else
				var matches = [this.defaultDataPredicateTemplate]
			var facts = [
				thing.s+' '+thing.p+' '+thing.o,
				'xxx '     +thing.p+' '+thing.o,
				'xxx '     +thing.p+' xxx'
			]
		}
		for (var i=0; i<facts.length; i++) {
			var thishash = this[facts[i]]
			if (thishash) {
				if (!angular.isArray(thishash)) thishash = [thishash] 
				for (var j=0; j<thishash.length; j++) {
					var current = thishash[j]
					if (current.priority > priority) {
						matches = [current]
						priority = current.priority
					} else if (current.priority == priority) {
						matches.push(current)
					}
				}
			}
		}
		return matches[randomSeed % matches.length]  
	}
	Entity.prototype.toUnderscore = function() {
		var r = {}
		for (var i in this) if (this.hasOwnProperty(i)) {
			var p = prefixes.toUnderscore(i) 
			r[p] = this[i]
		}
		return r
	}
	
	function templateDictionary() { 
		this.defaultObjectPredicateTemplate = {
			detail:0,
			priority:0,
			term: "?s ?p ?o",
			variables: ['s','p','o'],
			content: "<at select='{{o}}' ></at>"
		}
		this.defaultDataPredicateTemplate = {
			detail:0,
			priority:0,
			term: "?s ?p ?o",
			variables: ['s','p','o'],
			content: "{{o}}"
		}
		this.defaultEntityTemplate = {
			detail:0,
			priority:0,
			term: "?s",
			variables: ['s'],
			content: "{{s.rdfs_label}}" 
		}
	}
	templateDictionary.prototype = new Entity()
	templateDictionary.prototype.append = function(term,definition) {
		var me = this
		var doAppend = function(term,definition) {
			var parse = templateParser.parse(term)
			definition.priority = definition.priority || 1
			definition.detail = definition.detail || 100			
			definition.term = (definition.mode?'('+definition.mode+') ':"")+parse.ptn
			definition.variables = parse.vars
			var hash = definition.term
						
			if (!me[hash])  me[hash] = definition
			else if ( me[hash] != definition ){
				if (!(me[hash] instanceof Array))
					me[hash] = [me[hash]]
				if (definition && me[hash].indexOf(definition) == -1 )
					me[hash].push(definition)
			}
		
		}
		if (term instanceof Array) {
			for (var i= 0; i<term.length; i++) 
				me.append(term[i])
		} else if (term instanceof Object) {
			var k = Object.keys(term)
			for (var i=0; i<k.length; i++) {
				me.append(k[i], term[k[i]])
			}
		} else if (definition || definition==='') {
			doAppend(term, definition)
		} else {
			var bits = me.parse(term)
			me.append(bits)
		}
			
	}

	function prefDictionary() { }
	prefDictionary.prototype = new Entity()
	prefDictionary.prototype.parse = function(str) {
		var ret = []
		var bits = str.trim().split(/\s+/)
		for (var i=0; i<bits.length; i+=3) {
			var o = {}
			if (bits[i] == "PREFIX") {
				o[bits[i+1].match(/([^:]+):?/)[1]] = bits[i+2].match(/\<?([^\>]+)\>?/)[1]
				ret.push(o)
			}
		}
		return ret
	}
	prefDictionary.prototype.toUnderscore = function(str) {
		return this.short(str).replace(':','_')
	}
	prefDictionary.prototype.sparql = function() {
		var ret = []
		var k = Object.keys(this)
		for (var i = 0; i< k.length; i++) {
			if (k[i][0] !='#')
				ret.push("PREFIX "+ k[i] +": <"+this[k[i]]+">")
		}
		return ret.join("\n")
	}
	prefDictionary.prototype.short = function(long) {
		if (long) {
			var l = long.match(/<?([^>]+)>?/)[1]
			var k = this.getKeyByValue(l, function(l,s) { return (s.indexOf(l) == 0 ) })
			if (k) return k + ":" + l.substr(this[k].length)
			return long
		}
	}
	prefDictionary.prototype.long = function(short,withParens) {
		var before = withParens?'<':'' ;
		var after  = withParens?'>':'' ;
		if (short) {
			if (short=='a') return before+'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'+after
			var t = short.replace('_',':').split(":")
			if (this[t[0]]) return before+this[t.shift()] + t.join("")+after
			return short
		}
	}
	prefDictionary.prototype.prefix = function(uri) {
		if (uri) {
			return this.short(uri).split(':')[0]
		}
		return uri
	}
	prefDictionary.prototype.suffix = function(uri) {
		if (uri) {
			return this.short(uri).split(':')[1]
		}
		return uri
	}
	
	function Tristore() { 
		this['#startWith'] = []
	}
	
	Tristore.prototype.append = function(s,p,o,startWith) {
		var me = this
		if (!me['#startWith']) me['#startWith'] = [] 
		if (s instanceof Array) {
			for (var i= 0; i<s.length; i++) {
				me.append(s[i])
			}
		} else if (s instanceof Object) {
			var sub  = '<'+ ((s.s && s.s.value) || 'none')+'>'
			var pred = '<'+ ((s.p && s.p.value) || 'none')+'>'
			if (s.o && s.o.value)
				if (s.o.value.indexOf('http://')==0)
					var obj  = '<'+ s.o.value +'>'
				else 
					var obj  = s.o.value
			else 
				var obj = ''
			var sw   = (s.startWith && s.startWith.value=='true') || false
			if (sub != 'none' || pred != 'none') 
				me.append(sub, pred, obj, sw)
		} else {
			if (!me[s]) {
				me[s] = new Entity()
				me[s]['uri'] = s ;
			}
			me[s].append(p,o)
			if (startWith && me['#startWith'].indexOf(s) == -1 ) {
				me['#startWith'].push(s)
			}
			if (p=="<http://www.w3.org/1999/02/22-rdf-syntax-ns#type>") {
				if (!me['#type']) me['#type'] = {}
				if (!me['#type'][o]) me['#type'][o] = []
				if (me['#type'][o].indexOf(s) == -1) me['#type'][o].push(s)
			}
		}		
	}
	Tristore.prototype.query = function(mgr, sel, preload,succ,err) {
		var me = this
		var success = succ
		var error = err
		mgr.query(sel.query, preload, function(data){
			var ret = []
			me.append(data)
			var t = me['#startWith']
			for (var i=0; t && i< t.length; i++) {
				ret.push(entities[t[i]])
			}
			me['#startWith'] = []
			success.apply(this,[ret])
		}) 
	}

	Tristore.prototype.get = function(mgr, sel, preload,succ,err) {
		var me = this
		var success = succ
		var error = err
		var bucket = []
		switch (sel.type) {
		case 'entity - subject': // ??sub pred   obj.
			this.query(mgr,sel,preload,success,error)
			return
			break; 
		case 'entity - object':  //   sub pred ??obj.
			var o = []
			var s = [sel.items.s]
			for (var j=0; j<sel.items.p.length; j++) {
				o = []
				var p = prefixes.toUnderscore(sel.items.p[j])
				for (var k=0; k< s.length; k++) {
					if (!this[s[k]]) {
						this.query(mgr,sel,preload,success,error)
						return
					}
					var current = this[s[k]][p]
					if (current) {
						if (!angular.isArray(current)) 
							current = [current]
						o = o.concat(current)
					}
				}
				s = o
			}
			for (var i=0; i < o.length; i++) {
				if (!this[o[i]]) {
					this.query(mgr,sel,preload,success,error)
					return
				}
				bucket.push(this[o[i]]) 
			}
			success.apply(this,[bucket])
			return
			break; 
		case 'entity - uri':     // [ <uri1>, <uri2>, ... ]
			for (var i=0; i < sel.items.length; i++) {
				if (!this[sel.items[i]]) {
					this.query(mgr,sel,preload,success,error)
					return
				}
				bucket.push(this[sel.items[i]]) 
			}
			success.apply(this,[bucket])
			return
			break;
		case 'triple - uri':
			var o = []
			var s = [sel.items.s]
			for (var j=0; j<sel.items.p.length; j++) {
				o = []
				var p = sel.items.p[j]
				for (var k=0; k< s.length; k++) {
					if (!this[s[k]]) {
						this.query(mgr,sel,preload,success,error)
						return
					}
					var current = this[s[k]][prefixes.toUnderscore(p)]
					if (current) {
						if (!angular.isArray(current)) 
							current = [current]
						o = o.concat(current)
					}
				}
				s = o
			}
			for (var i=0; i<o.length; i++) {
				o[i] = { s: sel.items.s, p: sel.items.p, o:o[i] }
			}
			success.apply(this,[o])
			return
		case 'triple - subject':
// to be improved ;
			this.query(mgr,sel,preload,success,error)
			return
			break;
		default:
			throw 'unexpected type in <applytemplates select>'
			break;
		}
	}
	
	var appName = "RSLT" ;
	var randomSeed
	var prefixes
	var templates
	var entities
	
	var rsltDirectiveFactory = function(dataMgr,$compile) {
		return {
			restrict: 'E',
			scope: true, 
			link: {
				pre: function($scope, element, attributes, controller){
					if ($scope.created) throw("Only ONE <rslt> element allowed in a controller")
					$scope.created = true
					randomSeed = new Date().getUTCMilliseconds()
					prefixes = new prefDictionary() ;
					templates = new templateDictionary() ;
					entities = new Tristore();
					dataMgr.addTo(prefixes,attributes.prefixes,true)
					dataMgr.addTo(templates,attributes.templates,true)
					dataMgr.addTo(entities,attributes.startwith,true)
					dataMgr.setTripleStore(attributes.triplestore)
				}, 
				post: function($scope, element, attributes, controller){
					var cnt = templates['$start'].content
					var dom = $.parseHTML(cnt.trim())
					if (dom.length == 1 && dom[0].nodeType==1)
						var elm = $compile(dom[0])($scope)
					else
						var elm = $compile("<span>"+cnt+"</span>")($scope)
					element.html(elm)
				}
			}
		};
	}

	var prefixDirectiveFactory = function(dataMgr) {
		return {
			restrict: 'E',
			replace: true,
			link: {
				pre : function($scope, element, attributes, controller){
					if (!$scope.created) throw("Element <prefix> is only allowed within element <rslt>.")
					var ns = attributes['ns'] && attributes['ns'].split(': ')
					if (ns) {
						prefixes.append(ns[0], ns[1].match(/\<?([^\>]+)\>?/)[1])
					}
				}
			}
		};
	}
		
	var templateDirectiveFactory = function(dataMgr) {
		return {
			restrict: 'E',
			replace: true,
			link: {
				pre : function($scope, element, attributes, controller){
					if (!$scope.created) throw("Element <template> is only allowed within element <rslt>.")
					var tpl = {content: $(element).html().replace(/ng\-/g,'fv-') }
					if (attributes['priority']) tpl.priority = attributes['priority']
					if (attributes['detail']) tpl.detail = attributes['detail']
					if (attributes['mode']) tpl.mode = attributes['mode']
					if (attributes['withParams']) tpl.params = attributes['withParams'].split(/,\s*/)
					if (attributes['match']) {
						templates.append(attributes['match'],tpl)
					}
					if (attributes['name']) {
						templates.append('$'+attributes['name'],tpl)
					}
					
				}
			}
		};
	}

	var callTemplateDirectiveFactory = function(dataMgr, $compile) {
		return {
			restrict: 'E',
			transclude: true,
			link: {
				pre : function($scope, element, attributes, controller,transclude){
					if (attributes.name) {
						var cnt = templates['$'+attributes.name].content
						var dom = $.parseHTML(cnt.trim())
						if (dom.length == 1 && dom[0].nodeType==1)
							var elm = $compile(dom[0])($scope)
						else
							var elm = $compile("<span>"+cnt+"</span>")($scope)
						var destination = attributes.renderto || element
						$(destination).append(elm)
					}
				}
			}
		}
	}
	
	var foreachDirectiveFactory = function(dataMgr, $compile) {
		return {
			restrict: 'E',
			scope: true, 
			transclude: true,
			template: "<templatefor ng-repeat='item in items' item='item' data='data'  index='$index' length='items.length'></templatefor>",
			link: {
				pre : function($scope, element, attributes, controller,transclude){
					if (attributes.select) {
						var select= selectParser.parse(attributes.select)
						var tpl = templateParser.parse(attributes.select.replace(/\?\?/g,'?'))
						$scope.data = {
							select: attributes.select,
							vars: tpl.vars,
							collected: attributes.collected!==undefined,
							type: 'with'
						}
						transclude(function(original,scope) {
							var a = ''; 
							for (var i=0; i<original.length; i++) 
								a+= original[i].outerHTML || '' ; 
							$scope.data.cnt = a
						})
						entities.get(dataMgr, select, attributes.preload, function(data) {
							if ($scope.data.collected)
								$scope.items = [data]
							else
								$scope.items = data
						})
					}
				}
			}
		}
	}	
	
	var valueOfDirectiveFactory = function(dataMgr, $compile) {
		return {
			restrict: 'E',
//			template: "{{item}}",
			template: function(tElem, tAttrs){

					// Generate string content that will be used by the template
					// function to replace the innerHTML with or replace the
					// complete markup with in case of 'replace:true'
					return 'string to use as template';
			},
			link: {
				pre : function($scope, element, attributes, controller,transclude){
					if (attributes.select) {
						var prop = attributes.select.split(' ')
						$scope.item = entities[prop[0]][prefixes.toUnderscore(prop[1])]
					} else if (attributes.javascript) {
						
					}
				}
			}
		}
	}	
	
	var applyTemplateDirectiveFactory = function(dataMgr, $compile) {
		return {
			restrict: 'E',
			transclude: true,
			scope: true, 
			template: "<templatefor ng-repeat='item in items | orderBy:sort' item='item' data='data' index='$index' length='items.length' ></templatefor>",
			link: {
				pre : function($scope, element, attributes, controller, transclude){
					if (attributes.select) {
						var select= selectParser.parse(attributes.select)
						$scope.sort = function(item) {
							var a = '' ; 
							for (var i=0; i<$scope.data.sort.length; i++) { 
								a+= item['<'+prefixes.long($scope.data.sort[i])+'>'] 
							}
							return a
						}
						$scope.data = {
							select: attributes.select,
							priority: attributes.priority,
							mode: attributes.mode,
							detail: attributes.detail,
							renderto: attributes.renderto,
							type: 'applytemplates'
						}
						transclude(function(original,scope) {
							var sort = []; 
							original.each(function(i,t) { 
								if (t.localName=='sort') sort.push($(t).attr('select')) 
								if (t.localName=='ifnone') {
									$scope.data.cnt = $(t).html()
									$scope.data.vars = ['fake']
								}
							})
							$scope.data.sort = sort
						})
						entities.get(dataMgr, select, attributes.preload, function(data) {
							if (data.length>0) {
								$scope.items = data
								delete $scope.data.cnt
							} else if ($scope.data.cnt) {
								$scope.items = [[]]
							}
						})
					}
				}
			}
		}
	}	
	
	var templateForDirectiveFactory = function(dataMgr, $compile, $rootScope) {
		return {
			restrict: 'E',
			replace: true,
			scope: {item:'=', data: '=', index: '=', length: '='}, 
			link: {
				pre : function($scope, element, attributes, controller){
					$scope.last = $scope.index+1 == $scope.length
			    	$scope.count = function(n) { 
			    		if (angular.isArray(n) ) return n.length
			    		return 1 
    				} 
    				if (!$scope.data.cnt) {
						template = templates.match($scope.item, $scope.data)
	    			} else {
	    				template = {content: $scope.data.cnt, variables: $scope.data.vars }
	    			}
	    			if (template.params) {
	    				for (var i=0; i<template.params.length; i++) {
	    					$scope[template.params[i]] = $root[template.params[i]]
	    				}
	    			}

					if ($scope.item.getClassName() == 'Entity' || $scope.item.getClassName() == 'Array') {
						var sost = new RegExp('\\?'+template.variables[0],'g')
						var cnt = template.content.replace(sost, $scope.item.uri).trim()				
						$scope[template.variables[0]] = $scope.item
						$scope[template.variables[2]] = $scope.item
					} else {
						var sost = new RegExp('\\?'+template.variables[0],'g')
						var cnt = template.content.replace(sost, $scope.item.s).trim()				
						sost = new RegExp('\\?'+template.variables[1],'g')
						cnt = cnt.replace(sost, $scope.item.p)				
						sost = new RegExp('\\?'+template.variables[2],'g')
						cnt = cnt.replace(sost, $scope.item.o)				
						$scope[template.variables[0]] = $scope.item.s
						$scope[template.variables[1]] = $scope.item.p
						$scope[template.variables[2]] = $scope.item.o						
					}
					cnt = cnt.replace(/fv\-/g,'ng-').trim()
					var dom = $.parseHTML(cnt)
					if (dom.length == 1 && dom[0].nodeType==1)
						var elm = $compile(dom[0])($scope)
					else
						var elm = $compile("<span>"+cnt+"</span>")($scope)
					$(element).append(elm)
//					$(destination).after(elm)
//					$(destination).remove(); 
				}
			}
		}
	}
	
	var tryOrDirectiveFactory = function($interpolate) {
		return {
			restrict: 'E',
			replace: true,
			link: function($scope, element, attributes, controller){
        		var separator = '<or></or>'
        		var exp,f,r ;
				var pieces = element.html().split(separator)
				if (f = attributes['from']) {
					if ($scope[f]) {
						if (typeof $scope[f] == 'function')
							r = +($scope[f].apply(this,$scope,element,attributes,controller)) 
						else 
							r = +$scope[f]
					} else {
						r = +f
					}
					if (r== NaN || r > pieces.length) 
						exp = ''
					else
						exp = $interpolate(pieces[r])($scope)
				} else {
					var i=0; 
					while (!(exp=$interpolate(pieces[i], false, null, (pieces.length-1)>i++)($scope))) ;
				}
				element.after(exp)
				element.remove(); 
			}
		};
	}
		
	var dataMgrFactoryFactory = function($http,$interpolate,$compile,$log,triplestore) {
		$http.defaults.headers.common.Accept = "application/sparql-results+json, application/json, text/plain, */*"
		var queryTemplate = "\
{{prefixes}} \n\
SELECT DISTINCT ?s ?p ?o ?startWith WHERE { \n\n\
# graph \n\
{{graph}} \n\n\
# unions \n\
{ {{union}} } \n\
} \n\
# request n {{requestNo}} #"

		var requestNo = 0
		var mgr = { }
		
		var execQuery = function(replacements,success,error) {
			if (!error) error = $log.error
	//		var endpointURL = "http://two.eelst.cs.unibo.it:8181/data/query";
	//		var endpointURL = "http://eva.cs.unibo.it:8181/data/query";
	//		var endpointURL = "http://six.eelst.cs.unibo.it:8181/data/query";
			
			var endpointURL = triplestore
			replacements.requestNo=	requestNo++ 

			var q = $interpolate(queryTemplate)(replacements)
			replacements.prefixes ="PREFIX ..."
			var q1 = $interpolate(queryTemplate)(replacements)
			if (!finalQueries) finalQueries = []
			finalQueries.push(q1)
			if (endpointURL != '') {
				var queryUrl = endpointURL + "?format=json&query=" + encodeURIComponent(q);

				this.http(queryUrl, function(data) {
					var url = this.url || arguments[3].url
					var responseNo = decodeURIComponent(url).match(/# request n (\d+) #/)[1]
					if ((requestNo-1)+'' == responseNo) {
						success.apply(this,[data])
					}
				}, error);
			} else {
				console.log('No triplestore specified')
			}
		}

		mgr.query = function(query,preload,success,error) {
			var me = this
			var varsfound = {}
			if (query) {
				if (query.indexOf(' ')==-1) {
					var startWith = ['?'+query]
					var input = ''
				} else {
					var startWith = query.match(/\?\?\w+/g) || []
					var input = query
				}
				if (preload) {
					var vars = startWith.concat(preload.match(/\?\?\w+/g))
					input = input+'\n'+preload
				} else {
					var vars = startWith
				}
				input = input.replace(/\?\?/g,'?')
				var union = ''
				for (var i=0; vars&& i<vars.length; i++) {
					if (!varsfound[vars[i]]) {
						var start = ''
						varsfound[vars[i]] = true
						if (startWith && startWith.indexOf(vars[i]) >= 0)
							start = "\n  bind(true as ?startWith)  " 
						union += start+ "\n  bind("+vars[i].substr(1)+" as ?s)   ?s ?p ?o. \n} UNION {"						
					}
				}
		
				var replacements = {
					prefixes: 	prefixes.sparql(),
					graph:		input,
					union:		union
				}
				execQuery.apply(me,[replacements,function(data) {
					var d = data.results.bindings
					success.apply(me,[d])
				},error])
			}
		}

		mgr.http = function(uri,success,error) {
			if (this.synchronous && $.ajax) {
				$.ajax({
                    url: uri,
                    async: false,
                    success: success, 
                    error: error
                })
			} else {
				$http.get(uri).success(success).error(error)
			}
		}
		mgr.get = function(source,success,error) {
			if (source) {
				if (source.match(/^#\S+$/)) {
					var src = $(source).text() + $(source).val()
					try {
						var data = JSON.parse(src)
					} catch(err) {
						if (!err.name == 'SyntaxError') {
							error.apply(this,[err])
						}
						var data = src
					} 
					success.apply(this,[data])
				} else if (source.split(/\s+/).length>1) {
					try {
						var data = JSON.parse(source)
						success.apply(this,[JSON.parse(source)])
					} catch(err) {
						if (!err.name == 'SyntaxError') {
							error.apply(this,[err])
						}
						this.query(source,success,error)
					} 
				} else if (window[source]) {
					success.apply(this,[window[source]])
				} else {
					this.http(source, success, error)
				}
			}
		}
		mgr.addTo = function(destination, ref,synchronous) {
			this.synchronous = synchronous
			this.get(ref,function (data) {
				destination.append(data)
			})
		}
		mgr.setTripleStore = function(att) {
				triplestore = att
		}
		mgr.parse = function(str,preload,current) {
			var parse = {}
			var select = str || '. ?p ?o'
			var els = select.trim().split(/\s+/)

			uri = select.match(/^<?(http:\/\/[^ >]+)>?$/)
			if (uri) {
				if (entities[uri[1]]) {
					parse.type = 'local'
					parse.match = {s: uri[1]}
				} else {
					parse.type = 'query'
					parse.query = "bind(<"+uri[1]+'> as !!entity).'
					if (preload)
						parse.query += '\n'+preload
				}
			} else if (els.length == 3 && els[0] == '<.>') {
				parse.type = 'local'
				parse.match = {s: current, p: els[1], o:els[2]}
			} else {
				parse.type = 'query'
				parse.query = select.replace('??','!!')
				if (preload)
					parse.query += '\n'+preload
			}	
			return parse	
		} 
		return mgr 
	}
	
	var rsltFactoryFactory = function($compile) {
		var rslt = {}
		rslt.calltemplate = function(name,renderTo, replace) {
			if (!renderTo) renderTo = 'body'
			var cnt = templates['$'+ name].content
			var dom = $.parseHTML(cnt.trim())
			if (dom.length == 1 && dom[0].nodeType==1)
				var elm = $compile(dom[0])(this)
			else
				var elm = $compile("<span>"+cnt+"</span>")(this)
			$(renderTo).html(elm)
		}
		return rslt; 
	}
	
	var r = angular.module('rslt', [])
	.run(function($rootScope) { $rootScope.created = false })
	.config(function($sceProvider) { $sceProvider.enabled(false); })
	.value('triplestore','')
	.factory('rslt',                                                                 rsltFactoryFactory)
	.factory('dataMgr', ['$http', '$interpolate','$compile', '$log', 'triplestore',  dataMgrFactoryFactory])
	.directive('rslt',           ['dataMgr','$compile',               rsltDirectiveFactory])
	.directive('prefix',         ['dataMgr',                          prefixDirectiveFactory])
	.directive('valueof',        ['dataMgr','$compile',               valueOfDirectiveFactory]) 
	.directive('applytemplates', ['dataMgr','$compile',               applyTemplateDirectiveFactory]) 
	.directive('at',             ['dataMgr','$compile',               applyTemplateDirectiveFactory]) 
	.directive('calltemplate',   ['dataMgr','$compile',               callTemplateDirectiveFactory]) 
	.directive('ct',             ['dataMgr','$compile',               callTemplateDirectiveFactory]) 
	.directive('foreach',        ['dataMgr','$compile',               foreachDirectiveFactory]) 
	.directive('template',       ['dataMgr',                          templateDirectiveFactory])
	.directive('t',              ['dataMgr',                          templateDirectiveFactory])
	.directive('templatefor',    ['dataMgr','$compile', '$rootScope', templateForDirectiveFactory ])
	.directive('try',                                                 tryOrDirectiveFactory )
	.filter('plural', function() {
		return function(input,ifPlural) {
			if (input>1) 
				return ifPlural || 's';
		};
	})
	.filter('strip', function() {
		return function(input,l) {
			l = l || 1
			return input.slice(l,-1*l)
		};
	})
	.filter('single', function() {
		return function(input) {
			if (angular.isArray(input)) {
				return input[0]
			}
			return input;
		};
	})
	.filter('wrap', function() {
		return function(input, format) {
			// format MUST contain "$$"
			if (input) {
				return format.replace("$$",input)
			}
			return "";
		};
	})
	.filter('last', function() {
		return function(input, separator) {
			if (!separator) separator = /[\/#]/ 
			if (input) {
				return input.split(separator).pop()
			}
			return "";
		};
	});

	
/* ----------------------------------------------------------------- */
/*                                                                   */
/*         ####     #     ####    ####  #####  ####    ####          */
/*         #   #   # #    #   #  #      #      #   #  #              */
/*         #   #  #   #   #   #  #      #      #   #  #              */
/*         ####   #####   ###     ###   ###    ###     ###           */
/*         #      #   #   #  #       #  #      #  #       #          */
/*         #      #   #   #   #      #  #      #   #      #          */
/*         #      #   #   #   #  ####   #####  #   #  ####           */
/*                                                                   */
/* ----------------------------------------------------------------- */

/* ----------------------------------------------------------------- */
/*                                                                   */
/*  SELECT PARSER                                                    */
/*                                                                   */
/* ----------------------------------------------------------------- */

selectParser = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/
{ 
  ret = {}
  ret.type = 'check' 
  prefixes = {
    long: function(s) {
       return s
    }
  }
 
}

start  
  = tripleWithNoReturnVariable
  / tripleWithReturnVariable 
  / listOfUris

tripleWithNoReturnVariable 
  = s:variable S p:predicates S o:NRobject S '.'? S
       { 
         return { 
           type: 'triple - subject',
           items: {s:s, p:p, o:o },
           query: s+' '+p.join(' / ')+' '+o+'.'
         }
       }
  / s:uri S p:predicates S o:NRobject S '.'? S
       { 
         return { 
           type: 'triple - uri',
           items: {s:s, p:p, o:o },
           query: s+' '+p.join(' / ')+' '+o+'.'
         }
       }

tripleWithReturnVariable 
  = s:return S p:predicates S o:object S '.'? S
       { 
         return { 
           type: 'entity - subject',
           items: {s:s, p:p, o:o },
           query: s+' '+p.join(' / ')+' '+o+'.'
         }
       }
  / s:subject S p:predicates S o:return S '.'? S
       { 
         return { 
           type: 'entity - object',
           items: {s:s, p:p, o:o },
           query: s+' '+p.join(' / ')+' '+o+'.'
         }
       }

listOfUris = u:uris
       { 
         return { 
           type: 'entity - uri',
           items: u,
           query: u.join(', ')
         }
       }

predicates
  = p:predicate S '/' S ps:predicates  { ps.unshift(p); return ps }
  / p:predicate                        { return  [p] }

subject           = uri / variable / return
predicate         = uri / variable 
object            = uri / variable / return / string
NRobject          = uri / variable / string

uris
  = u:uri S ',' S us:uris             { us.unshift(u); return us }
  / u:uri                             { return  [u] }

uri = long / short

long   
  =  "<" "http://" u:extendedToken  ">" 
                               { return '<'+'http://'+u+'>' }
  /      "http://" u:extendedToken      
                               { return '<'+'http://'+u+'>' }

short  
  =  "<" p:token [:_] n:token ">"
                               { return '<'+prefixes.long(p+":"+n)+'>' }
  /      p:token [:_] n:token      
                               { return '<'+prefixes.long(p+":"+n)+'>' }


variable 
  = '?'   u:token                     { return "?"+u }

return 
  = '??'  u:token                     { ret.type='query'; return "??"+u }

string  
   = '"' s:nodoublequote '"'                   { return '"'+s+'"' }
   / "'" s:nosinglequote "'"                   { return '"'+s+'"' }

token = p:[a-zA-Z]t:[a-zA-Z0-9]*      { return p+t.join('')  }
extendedToken = p:[a-zA-Z]t:[a-zA-Z0-9_/\-\.]* { return p+t.join('')  }
nosinglequote = s:[^']+                        { return s.join('')    }
nodoublequote = s:[^"]+                        { return s.join('')    }
S  = [ \n\t]*

   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleIndices = { start: 0 },
        peg$startRuleIndex   = 0,

        peg$consts = [
          peg$FAILED,
          null,
          ".",
          { type: "literal", value: ".", description: "\".\"" },
          function(s, p, o) { 
                   return { 
                     type: 'triple - subject',
                     items: {s:s, p:p, o:o },
                     query: s+' '+p.join(' / ')+' '+o+'.'
                   }
                 },
          function(s, p, o) { 
                   return { 
                     type: 'triple - uri',
                     items: {s:s, p:p, o:o },
                     query: s+' '+p.join(' / ')+' '+o+'.'
                   }
                 },
          function(s, p, o) { 
                   return { 
                     type: 'entity - subject',
                     items: {s:s, p:p, o:o },
                     query: s+' '+p.join(' / ')+' '+o+'.'
                   }
                 },
          function(s, p, o) { 
                   return { 
                     type: 'entity - object',
                     items: {s:s, p:p, o:o },
                     query: s+' '+p.join(' / ')+' '+o+'.'
                   }
                 },
          function(u) { 
                   return { 
                     type: 'entity - uri',
                     items: u,
                     query: u.join(', ')
                   }
                 },
          "/",
          { type: "literal", value: "/", description: "\"/\"" },
          function(p, ps) { ps.unshift(p); return ps },
          function(p) { return  [p] },
          ",",
          { type: "literal", value: ",", description: "\",\"" },
          function(u, us) { us.unshift(u); return us },
          function(u) { return  [u] },
          "<",
          { type: "literal", value: "<", description: "\"<\"" },
          "http://",
          { type: "literal", value: "http://", description: "\"http://\"" },
          ">",
          { type: "literal", value: ">", description: "\">\"" },
          function(u) { return '<'+'http://'+u+'>' },
          /^[:_]/,
          { type: "class", value: "[:_]", description: "[:_]" },
          function(p, n) { return '<'+prefixes.long(p+":"+n)+'>' },
          "?",
          { type: "literal", value: "?", description: "\"?\"" },
          function(u) { return "?"+u },
          "??",
          { type: "literal", value: "??", description: "\"??\"" },
          function(u) { ret.type='query'; return "??"+u },
          "\"",
          { type: "literal", value: "\"", description: "\"\\\"\"" },
          function(s) { return '"'+s+'"' },
          "'",
          { type: "literal", value: "'", description: "\"'\"" },
          /^[a-zA-Z]/,
          { type: "class", value: "[a-zA-Z]", description: "[a-zA-Z]" },
          [],
          /^[a-zA-Z0-9]/,
          { type: "class", value: "[a-zA-Z0-9]", description: "[a-zA-Z0-9]" },
          function(p, t) { return p+t.join('')  },
          /^[a-zA-Z0-9_\/\-.]/,
          { type: "class", value: "[a-zA-Z0-9_\\/\\-.]", description: "[a-zA-Z0-9_\\/\\-.]" },
          /^[^']/,
          { type: "class", value: "[^']", description: "[^']" },
          function(s) { return s.join('')    },
          /^[^"]/,
          { type: "class", value: "[^\"]", description: "[^\"]" },
          /^[ \n\t]/,
          { type: "class", value: "[ \\n\\t]", description: "[ \\n\\t]" }
        ],

        peg$bytecode = [
          peg$decode("7!*) \"7\"*# \"7#"),
          peg$decode("!7-+|$74+r%7$+h%74+^%7(+T%74+J%.\"\"\"2\"3#*# \" !+4%74+*%4(6$(#'%#%$(#  $'#  $&#  $%#  $$#  $##  $\"#  \"#  *\x87 \"!7*+|$74+r%7$+h%74+^%7(+T%74+J%.\"\"\"2\"3#*# \" !+4%74+*%4(6%(#'%#%$(#  $'#  $&#  $%#  $$#  $##  $\"#  \"#  "),
          peg$decode("!7.+|$74+r%7$+h%74+^%7'+T%74+J%.\"\"\"2\"3#*# \" !+4%74+*%4(6&(#'%#%$(#  $'#  $&#  $%#  $$#  $##  $\"#  \"#  *\x87 \"!7%+|$74+r%7$+h%74+^%7.+T%74+J%.\"\"\"2\"3#*# \" !+4%74+*%4(6'(#'%#%$(#  $'#  $&#  $%#  $$#  $##  $\"#  \"#  "),
          peg$decode("!7)+' 4!6(!! %"),
          peg$decode("!7&+W$74+M%.)\"\"2)3*+=%74+3%7$+)%4%6+%\"$ %$%#  $$#  $##  $\"#  \"#  */ \"!7&+' 4!6,!! %"),
          peg$decode("7**) \"7-*# \"7."),
          peg$decode("7**# \"7-"),
          peg$decode("7**/ \"7-*) \"7.*# \"7/"),
          peg$decode("7**) \"7-*# \"7/"),
          peg$decode("!7*+W$74+M%.-\"\"2-3.+=%74+3%7)+)%4%6/%\"$ %$%#  $$#  $##  $\"#  \"#  */ \"!7*+' 4!60!! %"),
          peg$decode("7+*# \"7,"),
          peg$decode("!.1\"\"2132+R$.3\"\"2334+B%71+8%.5\"\"2536+(%4$67$!!%$$#  $##  $\"#  \"#  *C \"!.3\"\"2334+2$71+(%4\"67\"! %$\"#  \"#  "),
          peg$decode("!.1\"\"2132+]$70+S%08\"\"1!39+C%70+9%.5\"\"2536+)%4%6:%\"#!%$%#  $$#  $##  $\"#  \"#  *N \"!70+C$08\"\"1!39+3%70+)%4#6:#\"\" %$##  $\"#  \"#  "),
          peg$decode("!.;\"\"2;3<+2$70+(%4\"6=\"! %$\"#  \"#  "),
          peg$decode("!.>\"\"2>3?+2$70+(%4\"6@\"! %$\"#  \"#  "),
          peg$decode("!.A\"\"2A3B+B$73+8%.A\"\"2A3B+(%4#6C#!!%$##  $\"#  \"#  *S \"!.D\"\"2D3E+B$72+8%.D\"\"2D3E+(%4#6C#!!%$##  $\"#  \"#  "),
          peg$decode("!0F\"\"1!3G+G$ H0I\"\"1!3J,)&0I\"\"1!3J\"+)%4\"6K\"\"! %$\"#  \"#  "),
          peg$decode("!0F\"\"1!3G+G$ H0L\"\"1!3M,)&0L\"\"1!3M\"+)%4\"6K\"\"! %$\"#  \"#  "),
          peg$decode("! H0N\"\"1!3O+,$,)&0N\"\"1!3O\"\"\"  +' 4!6P!! %"),
          peg$decode("! H0Q\"\"1!3R+,$,)&0Q\"\"1!3R\"\"\"  +' 4!6P!! %"),
          peg$decode(" H0S\"\"1!3T,)&0S\"\"1!3T\"")
        ],

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleIndices)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleIndex = peg$startRuleIndices[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$decode(s) {
      var bc = new Array(s.length), i;

      for (i = 0; i < s.length; i++) {
        bc[i] = s.charCodeAt(i) - 32;
      }

      return bc;
    }

    function peg$parseRule(index) {
      var bc    = peg$bytecode[index],
          ip    = 0,
          ips   = [],
          end   = bc.length,
          ends  = [],
          stack = [],
          params, i;

      function protect(object) {
        return Object.prototype.toString.apply(object) === "[object Array]" ? [] : object;
      }

      while (true) {
        while (ip < end) {
          switch (bc[ip]) {
            case 0:
              stack.push(protect(peg$consts[bc[ip + 1]]));
              ip += 2;
              break;

            case 1:
              stack.push(peg$currPos);
              ip++;
              break;

            case 2:
              stack.pop();
              ip++;
              break;

            case 3:
              peg$currPos = stack.pop();
              ip++;
              break;

            case 4:
              stack.length -= bc[ip + 1];
              ip += 2;
              break;

            case 5:
              stack.splice(-2, 1);
              ip++;
              break;

            case 6:
              stack[stack.length - 2].push(stack.pop());
              ip++;
              break;

            case 7:
              stack.push(stack.splice(stack.length - bc[ip + 1], bc[ip + 1]));
              ip += 2;
              break;

            case 8:
              stack.pop();
              stack.push(input.substring(stack[stack.length - 1], peg$currPos));
              ip++;
              break;

            case 9:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1]) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 10:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] === peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 11:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] !== peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 12:
              if (stack[stack.length - 1] !== peg$FAILED) {
                ends.push(end);
                ips.push(ip);

                end = ip + 2 + bc[ip + 1];
                ip += 2;
              } else {
                ip += 2 + bc[ip + 1];
              }

              break;

            case 13:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (input.length > peg$currPos) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 14:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length) === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 15:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length).toLowerCase() === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 16:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (peg$consts[bc[ip + 1]].test(input.charAt(peg$currPos))) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 17:
              stack.push(input.substr(peg$currPos, bc[ip + 1]));
              peg$currPos += bc[ip + 1];
              ip += 2;
              break;

            case 18:
              stack.push(peg$consts[bc[ip + 1]]);
              peg$currPos += peg$consts[bc[ip + 1]].length;
              ip += 2;
              break;

            case 19:
              stack.push(peg$FAILED);
              if (peg$silentFails === 0) {
                peg$fail(peg$consts[bc[ip + 1]]);
              }
              ip += 2;
              break;

            case 20:
              peg$reportedPos = stack[stack.length - 1 - bc[ip + 1]];
              ip += 2;
              break;

            case 21:
              peg$reportedPos = peg$currPos;
              ip++;
              break;

            case 22:
              params = bc.slice(ip + 4, ip + 4 + bc[ip + 3]);
              for (i = 0; i < bc[ip + 3]; i++) {
                params[i] = stack[stack.length - 1 - params[i]];
              }

              stack.splice(
                stack.length - bc[ip + 2],
                bc[ip + 2],
                peg$consts[bc[ip + 1]].apply(null, params)
              );

              ip += 4 + bc[ip + 3];
              break;

            case 23:
              stack.push(peg$parseRule(bc[ip + 1]));
              ip += 2;
              break;

            case 24:
              peg$silentFails++;
              ip++;
              break;

            case 25:
              peg$silentFails--;
              ip++;
              break;

            default:
              throw new Error("Invalid opcode: " + bc[ip] + ".");
          }
        }

        if (ends.length > 0) {
          end = ends.pop();
          ip = ips.pop();
        } else {
          break;
        }
      }

      return stack[0];
    }

     
      ret = {}
      ret.type = 'check' 
     


    peg$result = peg$parseRule(peg$startRuleIndex);

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();	


/* ----------------------------------------------------------------- */
/*                                                                   */
/*  TEMPLATE PARSER                                                    */
/*                                                                   */
/* ----------------------------------------------------------------- */
templateParser = (function() {
  /*
   * Generated by PEG.js 0.8.0.
   *
   * http://pegjs.majda.cz/

{
	String.prototype.r = function(o) { 
		var r = this ; 
		for (var i in o) { 
			r = r.replace(new RegExp("\\$"+i, 'g'),o[i]) 
		} 
		return r 
	}

  prefixes = {
    long: function(s) {
       return s
    }
  }
  var str= {
      triple : "$0 $1 $2", 
      uri: "$0",
      property: "$0 -> $1"
  }
  var r = 'xxx'
 
}

start
   = n:name                     { return { ptn: n } }
   / t:triple 
   / u:uri                      { return { ptn: u, vars:[]} }           
   / property 
   / type

property
  = v:var S '->' S t:triple S         
           { return {
                 ptn: str.property.r([r, t.ptn]), 
                 vars: [v.u].concat(t.vars)
             } 
           }


type
  = '->' S u:uri S                    
           { return {
                 ptn: str.property.r([r, u]), 
                 vars: ['s']
             } 
           }

  / v:var S '->' S u:uri S
           { return {
                 ptn: str.property.r([r, u]), 
                 vars: [v.u]
             } 
           }
  / v1:var S '->' S v2:var S 'a' S u:uri S '.'? S
           { return {
                 ptn: str.property.r([r, u]), 
                 vars: [v1.u]
             } 
           }

triple
  = S s:subject S p:predicates S o:object S '.'? S
           { return {
                 ptn: str.triple.r([ s.u?r:s, p.u?r:p, o.u?r:o ]), 
                 vars: [s.u, p.u, o.u]
             } 
           }

predicates
  = p:predicate S '/' S ps:predicates      { ps.unshift(p); return ps }
  / p:predicate                            { return  [p] }

subject    = uri / var
predicate  = uri / var 
object     = uri / var / string

uri = long / short

long   
  =  "<" "http://" u:extendedToken  ">" 
                               { return '<'+'http://'+u+'>' }
  /      "http://" u:extendedToken      
                               { return '<'+'http://'+u+'>' }

short  
  =  "<" p:token [:_] n:token ">"
                               { return '<'+prefixes.long(p+":"+n)+'>' }
  /      p:token [:_] n:token      
                               { return '<'+prefixes.long(p+":"+n)+'>' }
name 
  = '$'   u:token                              { return '$'+u }

var 
  = '?'   u:token                              { return {u:u} }

string  
   = '"' s:nodoublequote '"'                   { return s }
   / "'" s:nosinglequote "'"                   { return s }

token = p:[a-zA-Z]t:[a-zA-Z0-9]*      { return p+t.join('')  }
extendedToken = p:[a-zA-Z]t:[a-zA-Z0-9_/\-\.]* { return p+t.join('')  }
nosinglequote = s:[^']+                        { return s.join('')    }
nodoublequote = s:[^"]+                        { return s.join('')    }
S  = [ \n\t]*


   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function SyntaxError(message, expected, found, offset, line, column) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.offset   = offset;
    this.line     = line;
    this.column   = column;

    this.name     = "SyntaxError";
  }

  peg$subclass(SyntaxError, Error);

  function parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},

        peg$FAILED = {},

        peg$startRuleIndices = { start: 0 },
        peg$startRuleIndex   = 0,

        peg$consts = [
          function(n) { return { ptn: n } },
          function(u) { return { ptn: u, vars:[]} },
          peg$FAILED,
          "->",
          { type: "literal", value: "->", description: "\"->\"" },
          function(v, t) { return {
                           ptn: str.property.r([r, t.ptn]), 
                           vars: [v.u].concat(t.vars)
                       } 
                     },
          function(u) { return {
                           ptn: str.property.r([r, u]), 
                           vars: ['s']
                       } 
                     },
          function(v, u) { return {
                           ptn: str.property.r([r, u]), 
                           vars: [v.u]
                       } 
                     },
          "a",
          { type: "literal", value: "a", description: "\"a\"" },
          null,
          ".",
          { type: "literal", value: ".", description: "\".\"" },
          function(v1, v2, u) { return {
                           ptn: str.property.r([r, u]), 
                           vars: [v1.u]
                       } 
                     },
          function(s, p, o) { return {
                           ptn: str.triple.r([ s.u?r:s, p.u?r:p, o.u?r:o ]), 
                           vars: [s.u, p.u, o.u]
                       } 
                     },
          "/",
          { type: "literal", value: "/", description: "\"/\"" },
          function(p, ps) { ps.unshift(p); return ps },
          function(p) { return  [p] },
          "<",
          { type: "literal", value: "<", description: "\"<\"" },
          "http://",
          { type: "literal", value: "http://", description: "\"http://\"" },
          ">",
          { type: "literal", value: ">", description: "\">\"" },
          function(u) { return '<'+'http://'+u+'>' },
          /^[:_]/,
          { type: "class", value: "[:_]", description: "[:_]" },
          function(p, n) { return '<'+prefixes.long(p+":"+n)+'>' },
          "$",
          { type: "literal", value: "$", description: "\"$\"" },
          function(u) { return '$'+u },
          "?",
          { type: "literal", value: "?", description: "\"?\"" },
          function(u) { return {u:u} },
          "\"",
          { type: "literal", value: "\"", description: "\"\\\"\"" },
          function(s) { return s },
          "'",
          { type: "literal", value: "'", description: "\"'\"" },
          /^[a-zA-Z]/,
          { type: "class", value: "[a-zA-Z]", description: "[a-zA-Z]" },
          [],
          /^[a-zA-Z0-9]/,
          { type: "class", value: "[a-zA-Z0-9]", description: "[a-zA-Z0-9]" },
          function(p, t) { return p+t.join('')  },
          /^[a-zA-Z0-9_\/\-.]/,
          { type: "class", value: "[a-zA-Z0-9_\\/\\-.]", description: "[a-zA-Z0-9_\\/\\-.]" },
          /^[^']/,
          { type: "class", value: "[^']", description: "[^']" },
          function(s) { return s.join('')    },
          /^[^"]/,
          { type: "class", value: "[^\"]", description: "[^\"]" },
          /^[ \n\t]/,
          { type: "class", value: "[ \\n\\t]", description: "[ \\n\\t]" }
        ],

        peg$bytecode = [
          peg$decode("!7++' 4!6 !! %*A \"7#*; \"!7(+' 4!6!!! %*) \"7!*# \"7\""),
          peg$decode("!7,+a$72+W%.#\"\"2#3$+G%72+=%7#+3%72+)%4&6%&\"%!%$&# \"$%# \"$$# \"$## \"$\"# \"\"# \""),
          peg$decode("!.#\"\"2#3$+F$72+<%7(+2%72+(%4$6&$!!%$$# \"$## \"$\"# \"\"# \"*\u010A \"!7,+a$72+W%.#\"\"2#3$+G%72+=%7(+3%72+)%4&6'&\"%!%$&# \"$%# \"$$# \"$## \"$\"# \"\"# \"*\xBB \"!7,+\xB0$72+\xA6%.#\"\"2#3$+\x96%72+\x8C%7,+\x82%72+x%.(\"\"2(3)+h%72+^%7(+T%72+J%.+\"\"2+3,*# \" *+4%72+*%4,6-,#+'#%$,# \"$+# \"$*# \"$)# \"$(# \"$'# \"$&# \"$%# \"$$# \"$## \"$\"# \"\"# \""),
          peg$decode("!72+\x86$7%+|%72+r%7$+h%72+^%7'+T%72+J%.+\"\"2+3,*# \" *+4%72+*%4)6.)#'%#%$)# \"$(# \"$'# \"$&# \"$%# \"$$# \"$## \"$\"# \"\"# \""),
          peg$decode("!7&+W$72+M%./\"\"2/30+=%72+3%7$+)%4%61%\"$ %$%# \"$$# \"$## \"$\"# \"\"# \"*/ \"!7&+' 4!62!! %"),
          peg$decode("7(*# \"7,"),
          peg$decode("7(*# \"7,"),
          peg$decode("7(*) \"7,*# \"7-"),
          peg$decode("7)*# \"7*"),
          peg$decode("!.3\"\"2334+R$.5\"\"2536+B%7/+8%.7\"\"2738+(%4$69$!!%$$# \"$## \"$\"# \"\"# \"*C \"!.5\"\"2536+2$7/+(%4\"69\"! %$\"# \"\"# \""),
          peg$decode("!.3\"\"2334+]$7.+S%0:\"\"1!3;+C%7.+9%.7\"\"2738+)%4%6<%\"#!%$%# \"$$# \"$## \"$\"# \"\"# \"*N \"!7.+C$0:\"\"1!3;+3%7.+)%4#6<#\"\" %$## \"$\"# \"\"# \""),
          peg$decode("!.=\"\"2=3>+2$7.+(%4\"6?\"! %$\"# \"\"# \""),
          peg$decode("!.@\"\"2@3A+2$7.+(%4\"6B\"! %$\"# \"\"# \""),
          peg$decode("!.C\"\"2C3D+B$71+8%.C\"\"2C3D+(%4#6E#!!%$## \"$\"# \"\"# \"*S \"!.F\"\"2F3G+B$70+8%.F\"\"2F3G+(%4#6E#!!%$## \"$\"# \"\"# \""),
          peg$decode("!0H\"\"1!3I+G$ J0K\"\"1!3L,)&0K\"\"1!3L\"+)%4\"6M\"\"! %$\"# \"\"# \""),
          peg$decode("!0H\"\"1!3I+G$ J0N\"\"1!3O,)&0N\"\"1!3O\"+)%4\"6M\"\"! %$\"# \"\"# \""),
          peg$decode("! J0P\"\"1!3Q+,$,)&0P\"\"1!3Q\"\"\" \"+' 4!6R!! %"),
          peg$decode("! J0S\"\"1!3T+,$,)&0S\"\"1!3T\"\"\" \"+' 4!6R!! %"),
          peg$decode(" J0U\"\"1!3V,)&0U\"\"1!3V\"")
        ],

        peg$currPos          = 0,
        peg$reportedPos      = 0,
        peg$cachedPos        = 0,
        peg$cachedPosDetails = { line: 1, column: 1, seenCR: false },
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleIndices)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleIndex = peg$startRuleIndices[options.startRule];
    }

    function text() {
      return input.substring(peg$reportedPos, peg$currPos);
    }

    function offset() {
      return peg$reportedPos;
    }

    function line() {
      return peg$computePosDetails(peg$reportedPos).line;
    }

    function column() {
      return peg$computePosDetails(peg$reportedPos).column;
    }

    function expected(description) {
      throw peg$buildException(
        null,
        [{ type: "other", description: description }],
        peg$reportedPos
      );
    }

    function error(message) {
      throw peg$buildException(message, null, peg$reportedPos);
    }

    function peg$computePosDetails(pos) {
      function advance(details, startPos, endPos) {
        var p, ch;

        for (p = startPos; p < endPos; p++) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }
        }
      }

      if (peg$cachedPos !== pos) {
        if (peg$cachedPos > pos) {
          peg$cachedPos = 0;
          peg$cachedPosDetails = { line: 1, column: 1, seenCR: false };
        }
        advance(peg$cachedPosDetails, peg$cachedPos, pos);
        peg$cachedPos = pos;
      }

      return peg$cachedPosDetails;
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, pos) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0180-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1080-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      var posDetails = peg$computePosDetails(pos),
          found      = pos < input.length ? input.charAt(pos) : null;

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        pos,
        posDetails.line,
        posDetails.column
      );
    }

    function peg$decode(s) {
      var bc = new Array(s.length), i;

      for (i = 0; i < s.length; i++) {
        bc[i] = s.charCodeAt(i) - 32;
      }

      return bc;
    }

    function peg$parseRule(index) {
      var bc    = peg$bytecode[index],
          ip    = 0,
          ips   = [],
          end   = bc.length,
          ends  = [],
          stack = [],
          params, i;

      function protect(object) {
        return Object.prototype.toString.apply(object) === "[object Array]" ? [] : object;
      }

      while (true) {
        while (ip < end) {
          switch (bc[ip]) {
            case 0:
              stack.push(protect(peg$consts[bc[ip + 1]]));
              ip += 2;
              break;

            case 1:
              stack.push(peg$currPos);
              ip++;
              break;

            case 2:
              stack.pop();
              ip++;
              break;

            case 3:
              peg$currPos = stack.pop();
              ip++;
              break;

            case 4:
              stack.length -= bc[ip + 1];
              ip += 2;
              break;

            case 5:
              stack.splice(-2, 1);
              ip++;
              break;

            case 6:
              stack[stack.length - 2].push(stack.pop());
              ip++;
              break;

            case 7:
              stack.push(stack.splice(stack.length - bc[ip + 1], bc[ip + 1]));
              ip += 2;
              break;

            case 8:
              stack.pop();
              stack.push(input.substring(stack[stack.length - 1], peg$currPos));
              ip++;
              break;

            case 9:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1]) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 10:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] === peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 11:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (stack[stack.length - 1] !== peg$FAILED) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 12:
              if (stack[stack.length - 1] !== peg$FAILED) {
                ends.push(end);
                ips.push(ip);

                end = ip + 2 + bc[ip + 1];
                ip += 2;
              } else {
                ip += 2 + bc[ip + 1];
              }

              break;

            case 13:
              ends.push(end);
              ips.push(ip + 3 + bc[ip + 1] + bc[ip + 2]);

              if (input.length > peg$currPos) {
                end = ip + 3 + bc[ip + 1];
                ip += 3;
              } else {
                end = ip + 3 + bc[ip + 1] + bc[ip + 2];
                ip += 3 + bc[ip + 1];
              }

              break;

            case 14:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length) === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 15:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (input.substr(peg$currPos, peg$consts[bc[ip + 1]].length).toLowerCase() === peg$consts[bc[ip + 1]]) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 16:
              ends.push(end);
              ips.push(ip + 4 + bc[ip + 2] + bc[ip + 3]);

              if (peg$consts[bc[ip + 1]].test(input.charAt(peg$currPos))) {
                end = ip + 4 + bc[ip + 2];
                ip += 4;
              } else {
                end = ip + 4 + bc[ip + 2] + bc[ip + 3];
                ip += 4 + bc[ip + 2];
              }

              break;

            case 17:
              stack.push(input.substr(peg$currPos, bc[ip + 1]));
              peg$currPos += bc[ip + 1];
              ip += 2;
              break;

            case 18:
              stack.push(peg$consts[bc[ip + 1]]);
              peg$currPos += peg$consts[bc[ip + 1]].length;
              ip += 2;
              break;

            case 19:
              stack.push(peg$FAILED);
              if (peg$silentFails === 0) {
                peg$fail(peg$consts[bc[ip + 1]]);
              }
              ip += 2;
              break;

            case 20:
              peg$reportedPos = stack[stack.length - 1 - bc[ip + 1]];
              ip += 2;
              break;

            case 21:
              peg$reportedPos = peg$currPos;
              ip++;
              break;

            case 22:
              params = bc.slice(ip + 4, ip + 4 + bc[ip + 3]);
              for (i = 0; i < bc[ip + 3]; i++) {
                params[i] = stack[stack.length - 1 - params[i]];
              }

              stack.splice(
                stack.length - bc[ip + 2],
                bc[ip + 2],
                peg$consts[bc[ip + 1]].apply(null, params)
              );

              ip += 4 + bc[ip + 3];
              break;

            case 23:
              stack.push(peg$parseRule(bc[ip + 1]));
              ip += 2;
              break;

            case 24:
              peg$silentFails++;
              ip++;
              break;

            case 25:
              peg$silentFails--;
              ip++;
              break;

            default:
              throw new Error("Invalid opcode: " + bc[ip] + ".");
          }
        }

        if (ends.length > 0) {
          end = ends.pop();
          ip = ips.pop();
        } else {
          break;
        }
      }

      return stack[0];
    }


    	String.prototype.r = function(o) { 
    		var r = this ; 
    		for (var i in o) { 
    			r = r.replace(new RegExp("\\$"+i, 'g'),o[i]) 
    		} 
    		return r 
    	}

      var str= {
          triple : "$0 $1 $2", 
          uri: "$0",
          property: "$0 -> $1"
      }
      var r = 'xxx'
     


    peg$result = peg$parseRule(peg$startRuleIndex);

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(null, peg$maxFailExpected, peg$maxFailPos);
    }
  }

  return {
    SyntaxError: SyntaxError,
    parse:       parse
  };
})();