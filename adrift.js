/** Define global variables
	1. raf = Animation frame function. Request Animation Frame.
	2. cgv = Canvasui global variables. 
	  2.1 preview - preview flag to display Canvas.log , set the value to false to prevent console logging
	  2.2 uid - auto-increment general purpose unique id
 */
var raf = window.requestAnimationFrame || window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame || window.msRequestAnimationFrame || function(f){return setTimeout(f, 1000/60)}; 
var cgv = { preview:false, uid:0, benchmark:{enable:true,start:0,end:0} };


/** CanvasUI, main controller for the project canvas
 *
 *	function CanvasUI 
 *	@constructor
 */
function CanvasUI() {

	this.fps = 60;
	this.scale = 1;	// canvas scale
	this.state = 0; // 0: preparing layout, 1: start layout, 2: pause layout, 3: processing layout, 4: standby layout, 5: end of layout	
	this.services = new Object(); // service object container
	this.components = new Object(); // component object container
	this.viewport = {left:0, top:0};
	this.layout = { height:window.innerHeight, opacity:100, width:window.innerWidth };
	
	var canvas = document.createElement('canvas');
	// canvas.id = 'canvas-'+CanvasUI.UUID();

	if( this.layout.height > this.layout.width && this.layout.height >= (this.layout.width*1.5)  ) {
		canvas.height = this.layout.width*1.5;
		canvas.width = this.layout.width;	
		canvas.style['margin-top'] = ( (this.layout.height - canvas.height)/2 ) + 'px';
		CanvasUI.log('Canvas orietation, acceptable ranged portrait. Setting height in reference to width.', this.layout);
	}
	else {
		canvas.height = this.layout.height;
		canvas.width = this.layout.height/1.5;	
		CanvasUI.log('Canvas orietation, landscape. Adjusting to portrait position, setting width in reference to height.', this.layout);
	}
	this.layout.height = canvas.height;
	this.layout.width = canvas.width;
	
	this.scale = canvas.width/480;
	
	document.body.appendChild(canvas); 
	
	this.context = canvas.getContext("glCanvas") ? canvas.getContext("glCanvas") : canvas.getContext("2d"); // context, canvas webgl or 2d 
	
	CanvasUI.log('Canvas Created. layout='+this.layout.width+','+this.layout.height, this.context );
};


/** Generate unique id
 *	
 *	function static UUID
 *	@return string, unique id
 */ 
CanvasUI.UUID = function(){	
	return cgv.uid++;
};


/** 
 *	
 *	function static extend
 *	@return 
 */
CanvasUI.extend = function(self, base) {
	for(var name in base){ 
		if( self[name] === undefined || (typeof base[name]!=='function') ) { self[name] = base[name];  }		
	}
	return self;
}


/** 
 *	
 *	function static log
 *	@return 
 */
CanvasUI.log = function( log, obj ) {
	if( cgv.preview && console && console.debug ){ 
		console.debug( log, obj ); 			
	}
}


/** 
 *	
 *	function static benchmarkStart
 *	@return 
 */
CanvasUI.benchmarkStart = function() {
	if( cgv.preview && cgv.benchmark.enable ) {
		cgv.benchmark.start = (new Date()).getTime(); 
	}	
}


/** 
 *	
 *	function static benchmarkEnd
 *	@return 
 */
CanvasUI.benchmarkEnd = function( log ) {
	if( cgv.preview && cgv.benchmark.enable ) {
		cgv.benchmark.end = (new Date()).getTime(); 
		CanvasUI.log('Benchmark, log['+log+'] took='+(cgv.benchmark.end-cgv.benchmark.start)+'ms', '' );
	}
}


/** Update, Replace canvasui property
 *   
 *	function set
 *	@param {Object} property for canvas ui
 */	
CanvasUI.prototype.set = function( property ) {
	for (var name in this) { this[name] = property[name]; }
};


/** Add a component that will be drawn or used in the canvas, layout
 *   
 *	function addComponent
 *	@see Sprite, SpriteFont, Mouse
 *	@param {Object} service object, 
 */	
CanvasUI.prototype.addService = function( service ){	
	service.context = this.context;	// assign the canvas context
	service.init( this ); // initialize the service
	this.services[ service.attribute.id ] = service; // add into the service dictionary
};	


/** Add a component that will be drawn or used in the canvas, layout
 *   
 *	function addComponent
 *	@param {Object} component object, @see Sprite, SpriteFont, Mouse
 */	
CanvasUI.prototype.addComponent = function( component ){	
	component.context = this.context;	// assign the canvas context
	component.init( this ); // initialize the component

	if( component.trait &&  Object.keys(component.trait).length>0 ) {
		for (var name in component.trait) { 		
			if( component.trait[ name ] ){		
				component.trait[ name ].component = component;
				component.trait[ name ].init(); 
			}
		} 
	}

	this.components[ component.attribute.id ] = component; // add into the component dictionary
};


/**	Retrieved components based on their id
 *   
 *	function getComponentById
 *	@param {string} id
 */	
CanvasUI.prototype.getComponentById = function( id ) {
	if( this.components[ id ] ) {
		return this.components[ id ];
	}	
	return false;
};


/**	Retrieved components based on their layer value
 *   
 *	function getComponentsByLayer
 *	@param {number} layerid
 */	
CanvasUI.prototype.getComponentsByLayer = function( layerid ) {
	var ar = [];
	for( var r in this.components ) {
		if( this.components[r].attribute.layer == layerid ) {
			ar.push( this.components[r] );	
		}		
	}	
	return ar;
};


/**	Remove components based on their id
 *   
 *	function removeComponentById
 *	@param {string} id
 */	
CanvasUI.prototype.removeComponentById = function( id ) {
	if( this.components[ id ] ) {
		this.components[ id ].onDestroy();
		delete this.components[ id ];
	}	
};


/** Perform rendering based on thier y-position, presents isometric drawing
 *   
 * 	function updateRenderIsometric
 */
CanvasUI.prototype.updateRenderIsometric = function() {
	var s = this;
	var sprites = [];
	var sprites_destroy = [];

	for(var r in s.components) {
		
		this.updateTrait( s.components[r] );

		if( s.components[r] instanceof Sprite || s.components[r] instanceof SpriteFont){ 
			if( s.components[r].attribute.state == -1 ) {				
				sprites_destroy.push( s.components[r]  );
			}
			else {
				sprites.push( s.components[r] );
			}			
		}
		else {			
			s.components[r].update( this );			
		}
	}		

	sprites.sort(function(a, b) {
		if (a.attribute.y+a.attribute.origin.y < b.attribute.y+b.attribute.origin.y) return -1;
		if (a.attribute.y+a.attribute.origin.y > b.attribute.y+b.attribute.origin.y) return 1;
		if (a.attribute.zIndex < b.attribute.zIndex) return -1;
		if (a.attribute.zIndex > b.attribute.zIndex) return 1;
		return 0;
	});

	for(var ly=0;ly<9;ly++){
		for(var i=0;i<sprites.length;i++){ if(sprites[i].attribute.layer==ly) { sprites[i].update( this ); } }	
	}

	for(var i=0;i<sprites_destroy.length;i++){
		this.removeComponentById( sprites_destroy[i].attribute.id );		
	}
};


/** Run the update on all components 
 *   
 * 	function updateRenderNormal
 */
CanvasUI.prototype.updateRenderNormal = function() {
	for(var r in this.components) {
		this.updateTrait( this.components[r] );
		this.components[r].update( this );			
	}	
};


/** Run the update on all traits of the component
 *   
 * 	function updateTrait
 */
CanvasUI.prototype.updateTrait = function( component ) {	
	
	for (var name in component.trait) { 
		if( component.trait[ name ] ){
			component.trait[ name ].component = component;
			component.trait[ name ].update(); 
		}	
	}

	
}


/** Perform canvas update
 *   
 * 	function update
 */ 		 
CanvasUI.prototype.update = function() {
	var s = this;
	this.context.clearRect(0, 0, s.layout.width, s.layout.height);	
	this.context.canvas.style.opacity = s.layout.opacity/100;

	this.updateRenderIsometric();		

	setTimeout(function(){ 
		raf(function(){  
			if( s.state==1 || s.state==4 ){ 
				s.state = 3;
				s.update();
				s.state = 4; 
			}  
			else if( s.state==3 ){
				setTimeout( function(){ s.update(); }, 1000/s.fps);
			}
		});  
	},1000/s.fps);					
	this.onUpdate();
};


/** Start the canvasui process
 *   
 * 	function start
 */
CanvasUI.prototype.start = function() {
	this.state = 1;
	this.onStart();
	this.update();
};


/** Pause the canvasui process
 *   
 * 	function pause
 */
CanvasUI.prototype.pause = function() {
	this.state = 2;
};


/** Resume the canvasui process
 *   
 * 	function resume
 */
CanvasUI.prototype.resume = function() {
	this.state = 4;
	this.update();
};

/** CanvasUI callbacks
 */
CanvasUI.prototype.onStart = function(){ };	

CanvasUI.prototype.onUpdate = function(){ };/**	Contains the image and sound assets used in this game
 *	1.1 sf0 - sprite font default fill #000 
 *	1.2 sf1 - sprite font fill #fff

 *	. mt0 - main tower, default
 *	. ta0 - tower attack effect
 *	. td - tower destroyed 
 *	. g0 - ground tile
 *	. ma1 - monster type {a} count {1}
 *	.
 *	. sx0 - background sound compilation
 *	. sx1 - sound effect of attack
 *	. sx2 - sound effect of destroy
 *	
 *	function Resource
 *	@constructor
 */
function Resource() { }

Resource.Total = {images:8,sounds:1 };

Resource.Images = [];

Resource.Sounds = [];

/**	
 *	
 *	static function Resource.vectori
 *	
 */
Resource.vectori = function() {
	var vectori = new Vectori();

	vectori.add({tag:'sf0',data:'R !&!.$.$,(,(.+.+!(!()$)$((%(!~R 8):&:"9!0!0.9.:-:+8&3&3)6)7+3+3$7$6&~R I!@!?"?.H.I-I)F)F+B+B$F$F&I&~R X"W!N!N.U.X+X)U)S+Q+Q$U$U)X)~R ^!]"].g.g+`+`)e)e&`&`$g$g!~R m!l"l.o.o)t)t&o&o$v$v!~R +0"0!1!<"=*=+<+6\'6&8(8(:$:$3+3~R 000=3=38787=:=:070753530~R ?0?=B=B0~R X0X<W=O=N<N7Q7Q:U:U0~R ]0]=`=`8c8d9d=g=g9e7g5g0d0d4c5`5`0~R m0l1l=v=v:o:o8o5o0~R !?!L$L$D&H(H*D*L-L-?*?\'D$?~R 0?0L3L3D7I7L:L:?7?7D3?~R I@H?@??@?K@LHLIKIGFIBIBBFBFIIG~R O?N@NLQLQIVIXGXBUBUFQFQBXBX@W?~R m?l@lLoLoHrHsLvLtFvCvBsBqEoEoBvBv@u?~R +N+R(R(Q$Q$R+U+Z*[![!W$W$X(X(W!T!O"N~R 0N;N;Q7Q7[4[4Q0Q~R BXBN@N?O?Z@[H[IZINFNFX~R QUQNONNONVR[T[XVXNUNUUSX~R ]N][`[cUf[i[iNfNfVdQbQ`V`N~R oPoNlNlQoUlXl[o[oYqWsYs[v[vXsUvQvNsNsPpTqS~R $_$]!]!`%d%j(j(d,`,])])_&b\'b~R 0]:]:`4f4g:g:j0j0e5`0`~R FgIgI^H]@]?^?i@jHjIiIgFgBgB`F`BfBgCgFb~R O]N`O`OjRjR]~R ]^^]f]g^gd`f`ggggj]j]ddbd````a]a~R l^m]u]v^vdviujmjlilfofogsgsenenbsbs`o`oala~R !s!w(w(y+y+l(l(t$t$t(p(l~R :l8o3o3q:q:x9y0y0v7v7t0t0m1l~R GlCl?q?x@yHyIxIqBqBtFtFvBvBqCq~R NlXlXpTtTyQyQsUoNo~R ]n_lelgngqfrgsgwey_y]w]s`p`vdvdt`t`qdqdo`o`t]q~R nllnlsnuqumyqyvtvososroroovovntl~pp  RR  Rz R~R ]A]D`D`A~R ]E]H`H`E~'});
	vectori.addchange('sf0',{ntag:'sf1',fill:'fff'});
	vectori.addchange('sf0',{ntag:'sf2',fill:'dd0'});
	vectori.addchange('sf0',{ntag:'sf3',fill:'f22'});

	vectori.add({tag:'btn',data:'_5(p$0#4#=u=v9v0~qu{fM%7R&~pp  RR 5zJ~_5(u$!#%#.u.v*v!~'});

	vectori.add({tag:'g', data:'qv4<kX/4R$~pp  }*4$Rz4~pq >7, $4~qu dM!94R$~R4 , .)22.2,)(~Rp ,)02,)(~^4!u+%))+*~^ !$+*,)+%~R42,2.;2D.D,;(~Rq2,;0D,;(~RJ6+6*7+7,~RJ7+8*8+7,~RJ6*7*8*7+~R4D,D.M2V.V,M(~RuD,M0V,M(~^4!uT-U,S)~^ !qS)S,T-~R4V,V._2h.h,_(~RvV,_0h,_(~^4!u\-^*^/~^ !$^/_-^*~R4h,h.q2z.z,q(~R$h,q0z,q(~^4!uo-p+n(~^ !$m,n(o-~R4 > @)D2@2>):~Rp >)B2>):~^4!u\':%>(A~^ !$\'?(>\':~R42>2@;DD@D>;:~Rq2>;BD>;:~RJ=??>?<==~RJ;>;====?~RJ?<=;;===~R4D>D@MDV@V>M:~RuD>MBV>M:~^4!uI>J=H:~^ !qH:H=I>~R4V>V@_Dh@h>_:~RvV>_Bh>_:~^4!u`<b9b>~^ !$b>c<b9~R4h>h@qDz@z>q:~R$h>qBz>q:~^4!uv?w=u:~^ !$t>u:v?~' });
	
	vectori.add({tag:'t', data:'p{  RR  R7~p|  RR4 ¶G~p}  RR4 ¶T~n !{q)Bw5JBBr;$w4!.$r)B~n !}q)fw5nBfr;Nw4c.Nr)f~n !}q)hw5pBhr;Ow4k.Or)h~n !{q)Ew5MBEr;\'w4*.\'r)E~n !|qVEwbMoErh\'wa$[\'rVE~n !|qVEwbMoErh\'wa*[\'rVE~n !}qVfwbnofrhNwac[NrVf~n !@qVhwbpohrhOwak[OrVh~' });

	vectori.add({tag:'e', data:'Rp$)$82GE8;)~o ! q4;v9R@9~_ ! ?1<5A4~_ ! /21796~RqQ)Q8_Gr8h)~_ ! [2]7e6~_ ! n1k5p4~o ! qb:vg6n9~pq>Rfz Uz~pp>Rfz %z&~' });
	

	vectori.loadComplete(function(){
		Resource.Images = Resource.Images.concat( vectori.images );
		CanvasUI.log( 'vectori.loadComplete', Resource.Images.length );
	});
};


/**	
 *	
 *	static function Resource.sound
 *	
 */
Resource.sound = function() {
	// base sound resources

	// app sound specific resources
	var s1 = Sound.parseNokiaPiece( '32- 2#a1 2f1 4- 4#a1 8#a1 8c2 8d2 8#d2 1f2 4- 4f2 4f2 8#f2 8#g2 1#a2 4- 4#a2 4#a2 8#g2 8#f2 4#g2 8#f2 2f2 2- 2f2 4#d2 8#d2 8f2 2#f2 2- 4f2 4#d2 4#c2 8#c2 8#d2 2f2 2- 4#d2 4#c2 4c2 8c2 8d2 2e2 2- 2g2 1f2', 1 );
	Resource.Sounds.push( {id:'default',tempo:1200,volume:0.1,repeat:true,octaveoffset:1,piece:s1} );	
	//legend of zelda

	var comp = Sound.compressNokiaPiece('32- 2#a1 2f1 4- 4#a1 8#a1 8c2 8d2 8#d2 1f2 4- 4f2 4f2 8#f2 8#g2 1#a2 4- 4#a2 4#a2 8#g2 8#f2 4#g2 8#f2 2f2 2- 2f2 4#d2 8#d2 8f2 2#f2 2- 4f2 4#d2 4#c2 8#c2 8#d2 2f2 2- 4#d2 4#c2 4c2 8c2 8d2 2e2 2- 2g2 1f2', 1 );
	
	var s2 = Sound.parseCompressPiece( comp );
	var s3 = Sound.parseCompressPiece( '@{"6"1${$6(6(8(:(;!=${$=$=(>(@!B${$B$B(@(>$@(>"="{"=$;(;(=">"{$=$;$9(9(;"="{$;$9$8(8(:"<"{"?!=');
	console.debug( '~'+comp+'~' );

};


/**	
 *	
 *	static function Resource.complete
 *	
 */
Resource.complete = function( callback ) {
	setTimeout(
		function(){ 
			if( Resource.Images.length == Resource.Total.images && Resource.Sounds.length == Resource.Total.sounds ) {
				callback();
			}
			else {
				Resource.complete( callback );	
			}			
		},100
	);
};


/**	
 *	
 *	static function Resource.get
 *	
 */
Resource.get = function( id, reference ) {
	for(var i=0;i<reference.length;i++) { 
		if( reference[i].id == id || reference[i].tag == id ) { return reference[i]; } 
	}
	return false;
};


/**	
 *	
 *	static function Resource.getImage
 *	
 */
Resource.getImage = function( id ) {
	return Resource.get( id, Resource.Images );
};


/**	
 *	
 *	static function Resource.getSound
 *	
 */
Resource.getSound = function( id ) {
	return Resource.get( id, Resource.Sounds );	
};

/** 
 *	Handles common calculations and assignments
 *	 
 *	function Commons
 *	@suppress {checkTypes} 
 */
function Commons(){ }


/** 
 *   
 * 	static function Commons.snapToIsoGrid
 *	@param {Object} p position in x,y coordinate
 *	@param {number} xg grid width
 *	@param {number} yg grid height 	 
 */
Commons.snapToIsoGrid = function( p, xg, yg) {
	var x = (xg/2) * Math.round(p.x/(xg/2)), 
		y = (yg/2) * Math.round(p.y/(yg/2)), 
		xr = xg * Math.round(p.x/xg), 
		yr = yg * Math.round(p.y/yg);

	if( x%xg == 0 && y%yg == 0 ) { 
		return {x:x,y:y}; 
	}
	else if( x%xg != 0 && y%yg != 0 ) { 
		return {x:x,y:y};	
	}
	return {x:xr,y:yr};				
}


/** 
 *   
 * 	static function Commons.coordinateIsoTo2d
 */
Commons.coordinateIsoTo2d = function( p, xg, yg, o) {
	if( o ) { p.x-=o.x; p.y-=o.y; }
	return {x:((p.x/(xg/2)) + (p.y/(yg/2)))/2, y:(p.y/(yg/2)-(p.x/(xg/2)))/2  };
}


/** 
 *   
 * 	static function Commons.coordinate2dToIso
 */
Commons.coordinate2dToIso = function( p, xg, yg, o) {
	if( o ) { return {x:((p.x-p.y)*(xg/2))+o.x ,y:((p.x+p.y)*(yg/2))+o.y } }
	return {x:((p.x-p.y)*(xg/2)) ,y:((p.x+p.y)*(yg/2))};
}


/**	Convert value with base1 to base2
 *	
 *	static function Vectori.convertBase
 */
Commons.convertBase = function(value, base1, base2) {
	if (typeof(value) == "number") {
		return parseInt(String(value),10).toString(base2);
	} else {
		return parseInt(value.toString(), base1).toString(base2)
	};
}


/**	Convert a string to its equivalent char code (-32)
 *	
 *	static function Vectori.toByte
 */
Commons.toByte = function( stringdata ) {
	var bytearray = [];
	for(var i=0;i<stringdata.length;i++){
		bytearray.push( stringdata.charCodeAt(i)-32 );
	}
	return bytearray;
}


/**	Convert char code (+32) to its equivalent string 
 *	
 *	static function Vectori.toChar
 */
Commons.toChar = function( data ) {
	var stringdata = '', bytearray = [];
	
	if( typeof data == 'number' ) {
		bytearray = bytearray.push(data)
	}
	else {
		bytearray = bytearray.concat( data );	
	}	

	for(var i=0;i<bytearray.length;i++){
		stringdata+= String.fromCharCode(bytearray[i]+32);		
	}

	return stringdata;
}


/**	Zero left padding
 *	
 *	static function Vectori.pad
 *	@param {number} width
 *	@param {string} string
 */
Commons.pad = function(width, string) {
	return (width <= string.length) ? string : Commons.pad(width, '0' + string)
}

/**	Inclusive between values	
 *	@param {number} min minimum value range
 *	@param {number} max maximum value range
 *	@return {number} between min and max
 */ 
Commons.betweenInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};


Commons.ismobile = function(){
    return (/iphone|ipod|android|ie|blackberry|fennec/).test (navigator.userAgent.toLowerCase());
}
/**
 *	This snippet is a crude and ugly svg compression script, intended to be used on stuffs
 *	that require extremely low file space. Using an asci string data, it converts it to an
 *	equivalent SVG format image object.
 *
 *
 *	SVG TYPES
 *	000: rectangle - rect = x, y, width, height, [stroke, stroke-width, fill, opacity]
 *	001: ellipse - ellipse = cx, cy, rx, ry, [stroke, stroke-width, fill, opacity]
 *	010: polyline - polyline = [stroke, stroke-width, fill, opacity], point
 *	011: polygon - polygon = [stroke, stroke-width, fill, opacity], point
 *	100: path - path = [stroke, stroke-width, fill, opacity], d
 *	101: def - def = [0, 0, 0, type gradient], 
 *
 *	SVG ATTRIBUTES
 *	0000: bit flags corresponding to the following [stroke, stroke-width, fill, opacity]
 *
 *	DATA PARSING
 *	[0], First byte will contain the svg type and the flag attributes
 *	[nth], Succeeding bytes will correspond to the SVG attributes depending on the order
 *	[~], A tilde will serve as a delimeter in case of multiple SVG type present
 *
 *	COLOR RANGE
 *	@see Vectori.color64 this is a Base4 color system 
 *
 *	PATH SVG TYPE SPECIAL HANDLING
 *	Path has a special case it cannot have a coordinate within 81-90 range. this will be 
 *	reserved for the following code: 81-M, 82-L, 83-H, 84-V, 85-C, 86-S, 87-Q, 88-T, 89-A, 
 *	  90-Z, 91-Toggle from upper or lower case.
 *
 *	NOTE
 *	- The number range for all Integer is 0-93 because I like it that way.
 *	- Colors are limted to 0,6,a,f values because I dont have enough digits to represent 
 *	  the entire spectrum.
 *	- The svg object has a fixed height and width of 900
 *	- All number coordinates are multiplied by 10
 *
 *	SUPPORTED BROWSERS
 *	IE9+, Chrome, Firefox
 *
 *	function Vectori
 *	@constructor
 * 
 */
function Vectori() { 
	this.images = [];
}

/** Add image on the stack
 *	
 *	function add
 *	@param {Object} image object { tag:string, width:int, height:int, instance:Image, data:data  }
 */
Vectori.prototype.add = function( image ) {
	var self = this;
	image.instance = this.create( image ); 		
	image.instance.tag = image.tag;
	image.src =  image.instance.src;
	image.width = 900;
	image.height = 900;
	image.instance.crossOrigin = 'anonymous';
	this.images.push( image );	
}


/** Checks if all the images have been successfully loaded
 *	
 *	function loadComplete
 *	
 */
Vectori.prototype.loadComplete = function( callback ) {
	var self = this;
	setTimeout(function(){
		for(var i=0;i<self.images.length;i++ ) {
			if( self.images[i].instance.hasloaded !== true ) {
				self.loadComplete( callback );
				return;
			}
		}
		callback();	
	},50);
}

/** Get image on the stack
 *	
 *	function get
 *	@param {string} tag name of the image
 */
Vectori.prototype.get = function( tag ) {
	for(var i=0;i<this.images.length;i++) {
		if( this.images[i].tag == tag )  { return this.images[i]; }
	}
	return false;
}

/*	Create the svg image
	
	function create
	@param {string} data
	@return {Image} SVG image object generated from the data string
 */
Vectori.prototype.create = function( image ){ 
	var content = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><svg height="900" width="900" xmlns="http://www.w3.org/2000/svg">',
		self = this, svgimg = new Image(); 

	// Set to fall upon create
	this.dcasetoggle = false;

	// Define a base64 svg image string
	if( image.src !== undefined ) {		
		svgimg.src = image.src;	
	}
	else {		
		svgimg.src = 'data:image/svg+xml;base64,' + btoa( content + this.parse( image.data )+'</svg>' );	
	}
	
	// Why is there a set timeout? It is because IE sucks
	svgimg.onload = function(){ 
		setTimeout(function(){
			self.onCreate( svgimg );
			svgimg.hasloaded = true;
		},10);		
	};

	return svgimg;
};

/**	Change the content of the data
 *
 *	function change
 *	@param {string} tag
 */
Vectori.prototype.addchange = function( tag, obj ){ 
	var img = this.get( tag );
	if( img !== false ) {
		var ori = img.src;
		var src = atob(ori.substring(26));

		// todo: replace all and replace a specific object

		// replace all fill values
		if( obj.fill ) {
			src = src.replace(/ fill="#000"/g, ' fill="#'+obj.fill+'"');
		}

		// replace all stroke values
		if( obj.stroke ) {
			src = src.replace(/ stroke="#000"/g, ' stroke="#'+obj.stroke+'"');
		}

		// add new image object with tag = ntag
		if( obj.ntag ) {
			var image = {tag:obj.ntag, src:ori.substring(0,26) + btoa(src)};
			this.add( image );
		}
	}	
};



/**	Convert data to png images
 *
 *	function createAsPng
 *	@param {string} data
 */
Vectori.prototype.createAsPng = function( data, context ) {
	context.clearRect(0, 0, 900, 900);
	context.drawImage( this.create(data) , 0, 0);
	var pngimage = new Image();
	pngimage.src = context.canvas.toDataURL('image/png');
	return pngimage;
};

/**	Convert first digit to 7 digit binary. The first 3 bits are control values, next 4 bits are flags values.
 *	
 *	function parse
 *	@param {string} stringdata
 */
Vectori.prototype.parse = function( stringdata ){
	var frames = stringdata.split('~'), parsedata = '';
	for(var i=0;i<frames.length;i++) {		
		if( frames[i].length > 0 ) {
			var bytearray = Commons.toByte( frames[i] );   
			parsedata += this.assign( bytearray, this.getControl( bytearray[0] ) );
		}
	}	
	// console.debug('parsedata=',parsedata);
	return parsedata;
};


/**	Get the svg type and attributes
 *	
 *	function getControl
 *	@param {number} firstbyte
 */
Vectori.prototype.getControl = function( firstbyte ){
	// get the 7 digit binary string
	var control = Commons.pad(7, Commons.convertBase(firstbyte, 10, 2) );

	// get the first 3 characters, get the last 4 characters
	if( control.substring(0, 3) == '101' ) { // <defs></defs> is an exception to shapes		 
		var stoptemplete = '<stop offset="$s%" style="stop-color:$c;stop-opacity:$o" />',
			deftemplate = '<defs><$g id="grad$s" $p>'+stoptemplete+stoptemplete+'</$g></defs>',
			grad = 'Gradient';
		if( control.charAt(6) == '0'){
			deftemplate = deftemplate.replace(/\$g/g,'linear'+grad).replace('$p','x1="$s%" y1="$s%" x2="$s%" y2="$s%"');			
		}
		else {
			deftemplate = deftemplate.replace(/\$g/g,'radial'+grad).replace('$p','cx="$s%" cy="$s%" r="$s%" fx="$s%" fy="$s%"');
		}
		return deftemplate
	}
	// shape object
	return this.getType( control.substring(0, 3) ).replace('$a',this.getAttribute( control.substring(3) ) ) + '/>';		
};


/**	Get the svg type
 *	
 *	function getType
 *	@param {string} typeflag a 3 character binary represented string
 */
Vectori.prototype.getType = function( typeflag ){
	var p = '$a points="$p"', 
		types = ['<rect x="$n" y="$n" width="$n" height="$n"$a','<ellipse cx="$n" cy="$n" rx="$n" ry="$n"$a','<polyline'+p,'<polygon'+p,'<path$a d="$d"'];	
	return types[ parseInt( Commons.convertBase( typeflag, 2, 10), 10 ) ]
};


/**	Get the svg attribute
 *	
 *	function getAttribute
 *	@param {string} attrflag a 4 character binary represented string
 */
Vectori.prototype.getAttribute = function( attrflag ){
	var stringattribute = '';
	var attributes = ['stroke="$c"','stroke-width="$s"','fill="$c"','opacity="$o"'];
	for(var i=0;i<4;i++ ){
		if( attrflag.substring(0+i,1+i)	== '1' ) {
			stringattribute += ' '+attributes[i];
		}
	}
	return stringattribute;
};


/**	Assigns the values provided in the byte array to the control string
 *	
 *	function assign
 *	@param {Array} bytearray
 *	@param {string} control 
 */
Vectori.prototype.assign = function( bytearray, control ) {
	for(var i=1;i<bytearray.length;i++) {
		var br = control.indexOf('$'), c = control.charAt(br+1), value = '';
		switch( c ) {
			case 'n':
				value = (bytearray[i]*10);
				break;
			case 'c': 
				value = Vectori.color64( bytearray[i] ); 
				break;
			case 'o':
				value = bytearray[i]>90 ? 1 : bytearray[i]/100; // any value greater than 90 has 1.0 opacity
				break;
			case 's': 
				value = bytearray[i]; 
				break;	
			case 'p': 				
				if( control.charAt(br-1) == ',' ) { 
					value = (bytearray[i]*10)+' '; 
				}
				else {
					value = (bytearray[i]*10)+','; 
				}
				if( i<bytearray.length-1 ) {
					value+='$p';
				}
				break;
			case 'd':
				value = this.toPathData(bytearray[i]); 
				if( i<bytearray.length-1 ) {
					value+='$d';
				}
				break;
		}
		control = control.replace('$'+c, value);
	}
	return control;
}


/**	Interpret the bytedata to its corresponding d path value
 *	
 *	function toPathData
 *	@param {number} bytedata
 */
Vectori.prototype.toPathData = function( bytedata ) {
	var d = 'MLHVCSQTAZ';
	// 81-M, 82-L, 83-H, 84-V, 85-C, 86-S, 87-Q, 88-T, 89-A, 90-Z, 91-Case Toggle
	if( bytedata < 81) return (bytedata*10)+' ';
	if( bytedata == 91 ) { this.dcasetoggle = this.dcasetoggle ? false : true; return ''; }
	return (this.dcasetoggle ? d.charAt(bytedata-81).toLowerCase() : d.charAt(bytedata-81) )+' ';
}

/**	Callback functions
 */
Vectori.prototype.onCreate = function( image ){ };




/**	A Base4 color series. loss for unused 30 digits of data. value range 0-63
 *	
 *	static function Vectori.color64
 *	@param {number} value
 */
Vectori.color64 = function( value ) {
	var s63 = 'fff';
	if( value <= 63 ) {
		s63 = Commons.convertBase(value, 10, 4);
		s63 = s63.replace(/[1]/g,'6').replace(/[2]/g,'a').replace(/[3]/g,'f');
		return '#' +  Commons.pad(3,s63);
	}	

	if(value == 90) {
		return 'none';
	}

	// for svg gradient values, range 91-93
	return 'url(#grad'+value+')';
};/** Handle image processes
 *
 *	fuction Imagei
 *	@constructor
 */
function Imagei() { 	
	this.images = [];
};

/** Add image on the stack
 *	
 *	function add
 *	@param image object { tag:string, src:string, width:int, height:int, instance:Image }
 */
Imagei.prototype.add = function( image ) { 
	image.instance = new Image();
	image.instance.tag = image.tag;
	image.instance.src = image.src;
	image.instance.crossOrigin = 'anonymous';					
	image.instance.onload = function(){};
	this.images.push( image );
};

/** Get image based on tag name
 *	
 *	function get
 *	@param tag string
 *	@return image object { tag:string, src:string, width:int, height:int, instance:Image }
 */
Imagei.prototype.get = function(tag) { 
	for(var i=0; i<this.images.length; i++) {
		if( this.images[i].tag == tag ) return this.images[i];
	}
	return false;
};

Imagei.prototype.onLoadAll = function( cb ){
	var lc = 0, s = this;
	for(var i=0;i<this.images.length;i++) {
		if( this.images[i].instance instanceof Image ) lc++;
	}

	if( lc == this.images.length) return cb();
	
	setTimeout(function(){ s.onLoadAll( cb ); },200);
}/** Mouse component
 *   
 * 	function Mouse
 *	@constructor
 *	@param attribute, optional configure attributes 
 */
function Mouse( attribute ) {
	this.instancevar = {};
	this.attribute = {
		id:'mouse-'+CanvasUI.UUID(), // string, mouse value
		type:'mouse', // final string, component type
		ismousedown:false, // boolean, flag to identify if mouse is down		
		position:{x:0, y:0, dx:0, dy:0, px:0, py:0, fx:0, fy:0}, // object, (x,y) int mouse position, (dx,dy) int mouse delta position, (px,py) int mouse previous position, (fx,fy) int mouse first down position
		flag:{useMouseMove:true, useMouseDown:true, useMouseUp:true, useMouseClick:true, useTouch:true} // object, boolean used to identify if listerners will be added
	};
	this.componentMouseDownCallback = [];
	for (var attrname in attribute) { this.attribute[attrname] = attribute[attrname]; }
};

/** Retrive the valid touch method for mobile device compatibility
 *   
 * 	static function getTouch
 *	@param evt 
 */ 
Mouse.getTouch = function( evt ) {
	return evt.touches[0] || evt.changedTouches[0] || evt.originalEvent.touches[0] || evt.originalEvent.changedTouches[0];
}


/** Initialize
 *   
 * 	function init
 *	@param canvasui 
 */ 
Mouse.prototype.init = function( canvasui ) {
	if( this.attribute.flag.useTouch && Commons.ismobile() ) {
		this.initTouch( canvasui );
	}
	else {
		this.initMouse( canvasui );
	}
};


/** Initialize touch event functions
 *   
 * 	function initTouch
 *	@param canvasui 
 */ 
Mouse.prototype.initTouch = function( canvasui ) {
	var s = this;
	s.context.canvas.addEventListener('touchmove', function(evt) {
		var touch = Mouse.getTouch(evt);
		s.attribute.ismousedown = true;
		s.getPosition( touch, canvasui );		
		s.onMouseMove( s.attribute );
	}, {'passive': true});	
	s.context.canvas.addEventListener('touchstart', function(evt) {
		var touch = Mouse.getTouch(evt);
		s.getPosition( touch, canvasui );
		s.attribute.position.fx = s.attribute.position.x;
		s.attribute.position.fy = s.attribute.position.y;
		s.attribute.ismousedown = true;
		s.onMouseDown( s.attribute );
		s.getComponentByPosition( canvasui );
	}, {'passive': true});
	s.context.canvas.addEventListener('touchend', function(evt) {
		var touch = Mouse.getTouch(evt);
		s.getPosition( touch, canvasui );
		s.attribute.ismousedown = false;
		s.onMouseUp( s.attribute );
	}, {'passive': true});
}

/** Initialize mouse event functions
 *   
 * 	function initMouse
 *	@param canvasui 
 */ 
Mouse.prototype.initMouse = function( canvasui ) {
	var s = this;
	if( this.attribute.flag.useMouseMove ) {
		s.context.canvas.addEventListener('mousemove', function(evt) {		
			s.getPosition( evt, canvasui );		
			s.onMouseMove( s.attribute );								
		});	
	}

	if( this.attribute.flag.useMouseDown ) {
		s.context.canvas.addEventListener('mousedown', function(evt) {		
			s.getPosition( evt, canvasui );
			s.attribute.position.fx = s.attribute.position.x;
			s.attribute.position.fy = s.attribute.position.y;
			s.attribute.ismousedown = true;
			s.onMouseDown( s.attribute );
			s.getComponentByPosition( canvasui );
		});
	}

	if( this.attribute.flag.useMouseUp ) {
		s.context.canvas.addEventListener('mouseup', function(evt) {		
			s.getPosition( evt, canvasui );
			s.attribute.ismousedown = false;
			s.onMouseUp( s.attribute );
		});
	}

	if( this.attribute.flag.useMouseClick ) {
		s.context.canvas.addEventListener('click', function(evt) {		
			s.getPosition( evt, canvasui );
			s.attribute.position.fx = s.attribute.position.x;
			s.attribute.position.fy = s.attribute.position.y;			
			s.onMouseClickAny( s.attribute );		
		});
	}	
}


/** Retrieve the mouse position in the canvas
 *   
 * 	function getComponentByPosition
 *	@param pos
 *	@param canvasui
 */
Mouse.prototype.getPosition = function(pos, canvasui) {	
	var c = this.context.canvas;
	var r = c.getBoundingClientRect();  
	var x = pos.pageX - r.left;
	var y = pos.pageY - r.top;

	var position = { 
		x:( x/canvasui.scale - canvasui.viewport.left ), 
		y: ( y/canvasui.scale - canvasui.viewport.top), 
		px:x, 
		py:y,
		dx:this.attribute.position.px-x,
		dy:this.attribute.position.py-y
	};
	
	CanvasUI.extend(this.attribute.position, position);
	
};



/** Callback components that are trigger by a mouse down
 *   
 * 	function getComponentByPosition
 *	@param {Object} canvasui
 */
Mouse.prototype.getComponentByPosition = function( canvasui ) {  
	for(var i=0;i<this.componentMouseDownCallback.length;i++) {
		var c = canvasui.components[this.componentMouseDownCallback[i].id];
		if( c && 
			this.attribute.position.x >= c.attribute.x+c.attribute.origin.x  && this.attribute.position.x <= ( (c.attribute.x+c.attribute.origin.x) + c.attribute.widthtotal) && 
			this.attribute.position.y >= c.attribute.y+c.attribute.origin.y  && this.attribute.position.y <= ( (c.attribute.y+c.attribute.origin.y) + c.attribute.height)  ) {				
				this.componentMouseDownCallback[i].cb( this, c ); 
			}		
	}
}

/** Add a component to a mouse down listener
 *   
 * 	function getComponentByPosition
 *	@param {string} componentid
 *	@param {Function} callbackfunction
 */
Mouse.prototype.addComponentMouseDownListener = function( componentid, callbackfunction ) { 
	this.componentMouseDownCallback.push( {id:componentid, cb:callbackfunction } );
};


/** Remove a component from a mouse down listener
 *   
 * 	function removeComponentMouseDownListener
 *	@param {string} componentid
 */
Mouse.prototype.removeComponentMouseDownListener = function( componentid ) { 
	for(var i=0;i<this.componentMouseDownCallback.length;i++) {
		if( this.componentMouseDownCallback[i].id == componentid ) {
			this.componentMouseDownCallback.splice(i,1);
		}
	}
};

Mouse.prototype.onComponentMouseDown = function( component ) { 
};

Mouse.prototype.onMouseMove = function( attribute ) { };

Mouse.prototype.onMouseDown = function( attribute ) { };

Mouse.prototype.onMouseUp = function( attribute ) { };

Mouse.prototype.onMouseClickAny = function( attribute ) { };
/** Creates sound via AudioContext, basic implentation for sound generation.
 *	References: Firefox Dev Network, https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth
 *
 *	It works best in chrome, firefox and edge a bit glitchy, IE nevermind. Limited implementation support.
 *
 *	
 *	function Sound
 *	@constructor
 *	@see CanvasUI
 *	@param attribute
 */
function Sound( attribute ) {
	this.attribute = { 
		id:'sound', 
		type:'sound',
		tempo:1200,
		data:[],
		volume:10,
		repeat:true,
		maxduration:2000,
		audiosupport:true,
		isplaying:false
	};	

	for(var name in attribute ) { this.attribute[name] = attribute[name]; }

	if( !(window.AudioContext || window.webkitAudioContext) ) {
		this.attribute.audiosupport = false;
		return;
	}

	// define the context and master gain
	this.audiocontext = new (window.AudioContext || window.webkitAudioContext)();

	// custom wave 
	var sineTerms = new Float32Array([0, 0, 1, 0, 1]);
	var cosineTerms = new Float32Array(sineTerms.length);
	this.customwave = this.audiocontext.createPeriodicWave(cosineTerms, sineTerms);

};

/**	Load the piece Sound Object. Piece = Object {freq:float, duration:int}
 *
 *	function load
 */
Sound.prototype.load = function( data ){ 
	var tdata = {tempo:this.attribute.tempo, repeat:this.attribute.repeat, volume:this.attribute.volume, maxduration:this.attribute.maxduration, piece:[]};

	for(var name in data ) { tdata[name] = data[name]; }

	this.attribute.data.push( tdata );
}


/**	Play the given piece based on id
 *
 *	function play
 *	@param {string} id of the piece to be played
 */
Sound.prototype.play = function( id ){ 	

	if( this.attribute.data.length <= 0 || this.attribute.audiosupport == false ) return;

	var data = this.getPiece( id );

	if( !data ) return;

	this.attribute.isplaying = true;

	data.osc.start();

	this.playSequence( data );
}


/**	Stop all running music
 *
 *	function stop
 */
Sound.prototype.stop = function() { 	
	for(var i=0; i<this.attribute.data.length; i++) { 
		if( this.attribute.audiosupport && this.attribute.data[i].osc ) {
			this.attribute.data[i].osc.stop();
		}
	}
	this.attribute.isplaying = false;
}

/**	Get piece data based on id
 *
 *	function getPiece
 *	@param {string} id of the piece to be played
 */
Sound.prototype.getPiece = function( id ){ 	
	var data = undefined;
	for(var i=0; i<this.attribute.data.length; i++) { 
		if( id == this.attribute.data[i].id ) { 
			data = this.attribute.data[i];
			data.piece = this.attribute.data[i].piece;
			data.osc = this.audiocontext.createOscillator();

			data.piecegain = this.audiocontext.createGain();	
			data.piecegain.connect( this.audiocontext.destination );
			data.piecegain.gain.value = data.volume;

			data.osc.connect( data.piecegain );
			data.osc.setPeriodicWave( this.customwave );

			data.index = 0;		
			break;
		}
	}

	if( data == undefined ) return false;

	return data;
};


/**	Get piece data based on id
 *
 *	function getPiece
 *	@param {Object} data of the piece to be played
 */
Sound.prototype.playSequence = function( data ){

	var self = this; 

	var duration = data.tempo / data.piece[ data.index ].duration;
	var durationMax = data.maxduration;
	var gainduration = duration<durationMax ? duration/2 : durationMax/2;

	if( data.piece[ data.index ].freq != undefined ) {
		data.osc.frequency.setValueAtTime( data.piece[ data.index ].freq, self.audiocontext.currentTime );
		data.osc.frequency.linearRampToValueAtTime(data.piece[ data.index ].freq, duration);
		data.piecegain.gain.setValueAtTime(data.piecegain.gain.value, self.audiocontext.currentTime);
		data.piecegain.gain.linearRampToValueAtTime(data.volume, self.audiocontext.currentTime + gainduration/1000);
		setTimeout( function(){ 
			data.piecegain.gain.setValueAtTime(data.piecegain.gain.value, self.audiocontext.currentTime);
			data.piecegain.gain.linearRampToValueAtTime(0, self.audiocontext.currentTime + gainduration/1000);  
		} ,gainduration);
	}	

	setTimeout(function(){		
		data.index++;
		if( data.index < data.piece.length ) {			
			self.playSequence( data );
		}
		else if(  data.repeat ) {
			data.index = 0;
			self.playSequence( data );
		}
		else {			
			data.osc.stop();
			self.onDone( data.id );
		}
	}, duration );

}


/**	Event callback when a given piece is completed
 *
 *	function onDone
 */
Sound.prototype.onDone = function( id ) { }


/** List of note frequence as listed from mozilla dev network.
 *	Reference notes: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Simple_synth	
 *	Check Stuttgart pitch
 *
 *	static array Sound.notetable
 *	static function Sound.setNotetable
 *	static function Sound.getFrequency
 *	
 */
Sound.notetable = []; 

Sound.setNotetable = function(){	

	var notes = 'C C# D D# E F F# G G# A A# B'.split(' ');
	
	var notefreq = [];
	for (var i=0; i<9; i++) { notefreq[i] = []; }

	// Stuttgart pitch
	var sp = Math.pow(2, (1/12))
	
	// reference frequency
	notefreq[4][ notes[9] ] = 440;

	// loop upward
	notefreq[4][ notes[10] ] = notefreq[4][ notes[9] ] * sp;
	notefreq[4][ notes[11] ] = notefreq[4][ notes[10] ] * sp;
	for(var i=5; i<=8; i++) {
		notefreq[i][ notes[0] ] = notefreq[i-1][ notes[11] ] * sp;
		for(var j=0; j<notes.length-1; j++) {
			notefreq[i][ notes[j+1] ] = notefreq[i][ notes[j] ] * sp;
		}
	}

	// loop downward
	for(var i=4; i>=0; i--) {
		notefreq[i][ notes[11] ] = notefreq[i+1][ notes[0] ] / sp;
		for(var j=notes.length-1; j>0; j--) {
			notefreq[i][ notes[j-1] ] = notefreq[i][ notes[j] ] / sp;
		}
	}

	Sound.notetable = notefreq;

}


/**	Get note frequency based on the note table
 *
 *	static function getFrequency	
 */
Sound.getFrequency = function(note, ocatave) {
	if( Sound.notetable.length <= 0 ) { Sound.setNotetable(); }
	return Sound.notetable[ parseInt(ocatave,10) ][ note.toUpperCase() ];
}


/**	Get the note based on frequency position relative to 440
 *
 *	static function getFrequencyByPosition	
 */
Sound.getFrequencyByPosition = function(position) {
	// 45 is the middle position, 

	var sp = Math.pow(2, (1/12)), base = 440;

	if( position > 90 ) { return undefined; }

	if( position < 45 ) {
		position = 45 - position;
		for(var i=0;i<position;i++) {
			base = base / sp;
		}

	}
	else if( position > 45 ) {
		position = position - 45;
		for(var i=0;i<position;i++) {
			base = base * sp;
		}
	}
	
	return base;
}


/**	Get the note based on frequency position relative to 440
 *
 *	static function getFrequencyByPosition	
 */
Sound.getPositionByFrequency = function( freq ) {
	var position = 45, sp = Math.pow(2, (1/12)), base = 440;

	if( freq == undefined ) return 91;

	if( freq < 440 ) {		
		while(position>0) {
			position--;
			base = base / sp;
			if( Math.floor(base) == Math.floor(freq) ) {
				break;
			}			
		}
	}
	else if( freq > 440 ){
		while(position<90) {
			position++;
			base = base * sp;
			if( Math.floor(base) == Math.floor(freq) ) {
				break;
			}			
		}
	}
	
	return position;
}


/**	Parse and compress nokia composer piece,
 *	first character is duration, second character is frequency. this will compress the data up to 50%, it will lose 
 *	other information such as note, octave. It is also limited to 90 octave values relative to 440 frequency.
 *
 *	static function compressNokiaPiece	
 */
Sound.compressNokiaPiece = function( piece, octaveoffset ) {
	var cp = Sound.parseNokiaPiece( piece, octaveoffset );
	var cbyte = [];

	for(var i=0;i<cp.length;i++) {
		cbyte.push( cp[i].duration );		
		cbyte.push( ( cp[i].freq == undefined ) ? 91 : Sound.getPositionByFrequency( cp[i].freq ) );				
	}

	return Commons.toChar( cbyte );
}




/**	Parse nokia composer piece. 
 *
 *	static function parseNokiaPiece	
 */
Sound.parseNokiaPiece = function( piece, octaveoffset ) {
	var arpiece = piece.toUpperCase().split(" "), arconverted = [];
	for(var i=0;i < arpiece.length; i++ ) {
		var cp = Sound.parseNokiaNote( arpiece[i] );
		cp.freq = Sound.getFrequency( cp.note, cp.ocatave + octaveoffset );	
		arconverted.push( cp );
	}
	return arconverted;
}

/**	Parse compressed piece. Retrieves the duration and frequency from the 2 byte data
 *
 *	static function parseCompressPiece	
 */
Sound.parseCompressPiece = function( string ){
	var serial = Commons.toByte( string ), arconverted = [];
	for(var i=0;i < serial.length; i+=2 ) {
		arconverted.push( {duration:serial[i],freq:Sound.getFrequencyByPosition(serial[i+1]) } );			
	}
	return arconverted;
}


/**	Parse nokia composer notes. 
 *
 *	static function parseNokiaNote	
 */
Sound.parseNokiaNote = function( string ){

	//  remove the last digit it is the octave unless it is a dash thus it is a pause
	var duration = 2;
	var ocatave = string[string.length-1];
	var note = '';

	if( ocatave == '-') {
		duration = parseInt( string.substring(0, string.length-1), 10 );
		return {duration:duration, note:'-', ocatave:0};
	}

	ocatave = parseInt( ocatave, 10 );

	if( string.startsWith('16') || string.startsWith('32') ) {
		duration = parseInt( string.substring(0,2), 10 );
		note = string.substring(2, string.length-1);
		note = note.split("").reverse().join("");
		return {duration:duration, note:note, ocatave:ocatave};
	}

	duration = parseInt( string.substring(0,1), 10 );	
	note = string.substring(1, string.length-1);
	note = note.split("").reverse().join("");

	return {duration:duration, note:note, ocatave:ocatave};
}

/**
 * 	function BaseTrait
 *	@constructor
 *	@suppress {checkTypes}
 */
function BaseTrait() { 
	this.component = new BaseComponent();
	this.name = '';
	// this.type = 'BaseTrait';
	this.speed = 1;
	this.enabled = false;
};


BaseTrait.prototype.init = function(){ };

BaseTrait.prototype.update = function(){ };

BaseTrait.prototype.getSelf = function() {
	return new BaseTrait();
}

BaseTrait.prototype.copy = function() {
	var base = this.getSelf();
	
	base.component = this.component;

	for (var name in this) { 		
		if( typeof this[ name ] == 'string' || typeof this[ name ] == 'number' ) {
			base[ name ] = this[ name ];	
		}				
	} 
	
	return base;
}

/**
 * 	function MoveTo
 *	@constructor
 *	@extends {BaseTrait} 
 *	@suppress {checkTypes}
 */
function MoveTo() { 

	CanvasUI.extend(this, new BaseTrait());

	// this.type = 'MoveTo';
	this.speed = 1;
	this.x = 0;
	this.y = 0;

	this.hasNotOnMoveTo = true;
};

MoveTo.prototype.getSelf = function() {
	return new MoveTo();
}

MoveTo.prototype.init = function(){ 
	this.x = this.component.attribute.x;
	this.y = this.component.attribute.y;	
};

MoveTo.prototype.update = function(){ 
	if( this.enabled==false ) return;
	
	for(var i=0;i<this.speed;i++){
		if(this.x < this.component.attribute.x) { this.hasNotOnMoveTo = true; this.component.attribute.x--; }
		if(this.x > this.component.attribute.x) { this.hasNotOnMoveTo = true; this.component.attribute.x++; }
		if(this.y < this.component.attribute.y) { this.hasNotOnMoveTo = true; this.component.attribute.y--; }
		if(this.y > this.component.attribute.y) { this.hasNotOnMoveTo = true; this.component.attribute.y++; }		
	}

	if(this.x == this.component.attribute.x && this.y == this.component.attribute.y && this.hasNotOnMoveTo) {
		this.hasNotOnMoveTo = false;
		this.enabled = false;
		this.onMoveTo();
	}
};

MoveTo.prototype.onMoveTo = function(){ };

/** Fade, trait
 *
 *	function Fade 
 *	@constructor
 *	@extends {BaseTrait} 
 *	@suppress {checkTypes} 
 */
function Fade() { 
	
	CanvasUI.extend(this, new BaseTrait());

	// this.type = 'Fade';	
	this.opacity = 0;
	this.speed = 1;

	this.hasNotFadeIn = false;
	this.hasNotFadeOut = false;
	this.destroyOnFadeOut = true;	
};

Fade.prototype.getSelf = function() {
	return new Fade();
}

Fade.prototype.init = function(){ 
	this.opacity = this.component.attribute.opacity;	
};

Fade.prototype.update = function(){ 
	if( this.enabled==false ) return;
	
	for(var i=0;i<this.speed;i++){
		if(this.opacity < this.component.attribute.opacity) { this.hasNotOnMoveTo = true; this.component.attribute.opacity--; }
		if(this.opacity > this.component.attribute.opacity) { this.hasNotOnMoveTo = true; this.component.attribute.opacity++; }
	} 

	if(this.component.attribute.opacity == this.opacity) {
		this.hasNotFadeIn = false;
		this.enabled = false;
		if( this.opacity > 0  ) { this.onFadeIn(); }
		if( this.opacity == 0 ) { 
			this.onFadeOut();
			if( this.destroyOnFadeOut ) {
				this.component.destroy();	
				this.component.attribute.state = -1;
			}			
		}		
	}
	if( this.component.attribute.opacity < 0 || this.component.attribute.opacity > 100 ) {
		this.enabled = false;
	}

};

Fade.prototype.onFadeIn = function(){ };

Fade.prototype.onFadeOut = function(){ };/** Component animation 
 *
 * 	function Animation
 *	@constructor
 *	@extends {BaseTrait} 
 *	@suppress {checkTypes}
 */
function Animation() { 

	CanvasUI.extend(this, new BaseTrait());

	this.animationName = '';

	// this.type = 'Animation';

	this.list = [];

	this.repeat = true;

	this.framecount = 0;

	this.frameSpeed = 0;

	this.framedata = 0;

	this.data = [];
	
};

Animation.prototype.getSelf = function() {
	return CanvasUI.extend(new Animation(), this);
}

Animation.prototype.update = function(){ 
	if( this.enabled==false ) return;
	
	if(this.framedata > this.data.length-1) { 
		this.framedata=0; 
		if( this.repeat === false ){
			this.enabled = false;			
			this.onAnimationEnd( this.name );
		}	
	}

	if( this.frameSpeed+this.data[this.framedata+2] < this.framecount ) {
		this.component.attribute.container = [];
		this.component.attribute.sheet.px = this.data[this.framedata];
		this.component.attribute.sheet.py = this.data[this.framedata+1];	
		this.framedata+=3;
		this.framecount=0;
			
	}
	
	
	this.framecount++;

};


/**	Animation can only occur for sprite sheets
 *
 *	function add
 */
Animation.prototype.add = function( entry ) {
	/*	animation = [ animationItem, ... ];
		animationItem = { name:'', initialFrame:0, speedFrame:1, origin:{x:,y:}, repeat:boolean, image:{ src:'', instance }, sheet:{}, data:[ animationAttribute, ... ] }
		animationAttribute = {px,py}
	 */
	entry = CanvasUI.extend({name:'',initialFrame:0,frameSpeed:10,repeat:true,image:{},sheet:{nh:1,nw:1,px:0,py:0},data:[0,0,0] }, entry);
	
	this.list.push(entry);
}


/**	Play the given animation id
 *
 *	function playAnimation
 *	@param {string} name
 */
Animation.prototype.play = function( name ) {
		
	for(var i=0; i<this.list.length; i++) {		
		if( this.list[i].name == name ) { 
			// trigger the animation in the queue

			this.component.attribute.container = [];
			this.component.attribute.image = this.list[i].image;
			this.component.attribute.sheet = this.list[i].sheet			
			this.enabled = true; // allow animation update
			//console.debug('playAnimation',this.list[i]);
			//console.debug('playAnimation.attribute',this.component.attribute.image);
			this.animationName = name;
			this.framecount = 0;
			this.framedata = 0; // play from beginning
			this.frameSpeed = this.list[i].frameSpeed;			
			this.data = this.list[i].data;
			this.repeat = this.list[i].repeat;

			break;
		}
	}
}

Animation.prototype.onAnimationEnd = function( name ){ };

/** Component animation for vectori objects. This are animation based on vector transformation.
 *
 * 	function VectoriAnimate
 *	@constructor
 *	@extends {BaseTrait} 
 *	@suppress {checkTypes}
 */
function VectoriAnimate() { 

	CanvasUI.extend(this, new BaseTrait());

	this.animationName = '';

	
	
};

VectoriAnimate.prototype.getSelf = function() {
	return CanvasUI.extend(new VectoriAnimate(), this);
}

VectoriAnimate.prototype.update = function(){ 


};


/**	VectoriAnimate can only occur for sprite sheets
 *
 *	function add
 */
VectoriAnimate.prototype.add = function( entry ) {
	
}


/**	Play the given animation id
 *
 *	function playAnimation
 *	@param {string} name
 */
VectoriAnimate.prototype.play = function( name ) {
	
}

VectoriAnimate.prototype.onAnimationEnd = function( name ){ };

/** BaseComponent
 *
 *	function BaseComponent 
 *	@constructor
 *	@suppress {checkTypes} 
 */
function BaseComponent() { 	
	this.attribute = { 
		id:CanvasUI.UUID(), 
		// type:'BaseComponent', 
		x:0, y:0, // int, axis position
		width:0, height:0, // int, dimensions
		angle:0, // int, angle of rotation in degrees
		opacity:100, // int, sprite opacity 0-100
		layer:0, // maximum of 5 layers rendering is lowest layer is first
		zIndex:0, // priority within the same layer
		state:0 // state, -1:destroy, 0:neutral, 1:active 
	}

	this.trait = {fade:false, moveto:false, animation:false}; // 

	this.instancevar = {};
};

BaseComponent.prototype.init = function( canvasui ){  };

BaseComponent.prototype.update = function( canvasui ){ };

BaseComponent.prototype.set = function( attribute ) {
	for (var name in attribute) { 
		this.attribute[name] = attribute[name]; 		
	}	
}

BaseComponent.prototype.getSelf = function() {
	return new BaseComponent();
}

BaseComponent.prototype.copy = function() {
	var base = this.getSelf();
	base.context = this.context;
	return base;
}

BaseComponent.prototype.destroy = function() {
	this.attribute.state = -1;
}	

BaseComponent.prototype.onCreate = function() {}

BaseComponent.prototype.onDestroy = function() {}

/** Draws an isometric grid
 *	
 *	function Grid
 *	@constructor
 *	@param attribute
 */
function Grid( attribute ) {
	this.attribute = { 
		id:'grid'+CanvasUI.UUID(), 
		type:'grid',
		name:'grid'
	};
};

Grid.prototype.init = function(){ }

Grid.prototype.update = function( canvasui ){	
	this.context.save();
	this.context.scale(canvasui.scale,canvasui.scale);	
	for(var i=-30;i<30;i++) {		
		this.context.strokeStyle="#222";
		this.context.beginPath();
		this.context.moveTo(canvasui.viewport.left%64 - 64, canvasui.viewport.top%32 + (i*32) );
		this.context.lineTo(canvasui.viewport.left%64 - 64 + 64*40, canvasui.viewport.top%32 + (i*32)+32*40);
		this.context.stroke();	
		this.context.beginPath();
		this.context.moveTo(canvasui.viewport.left%64 - 64 +(64*30), canvasui.viewport.top%32 + i*32);
		this.context.lineTo( canvasui.viewport.left%64 - 64 ,canvasui.viewport.top%32 + (i*32)+32*30);
		this.context.stroke();			
	}
	this.context.restore();	
}
/** Sprite
 *  
 *  function Sprite
 *	@constructor
 *	@extends {BaseComponent} 
 *	@param {Object} attribute  
 *	@see {@link CanvasUI}
 */
function Sprite( attribute ) {

	CanvasUI.extend(this, new BaseComponent());		
	
	// this.attribute.type = 'Sprite'; 		
	this.attribute.bgc = false; // mixed|string, background image color 
	this.attribute.image = { src:'', instance:{ src:'', onload:function(){} } }; // object, image instance	
	this.attribute.origin = {x:0,y:0}; // object, offset value from origin		
	this.attribute.sheet = {nh:1,nw:1,px:0,py:0}; // when the image is a spritesheet define the count per width and height, position in the sheet
	this.attribute.container = []; // mixed boolean|array object, text character image array		
	this.attribute.parallax = {x:1,y:1}; // implement parallax relative to the viewport, value is in percentage
	this.attribute.widthtotal = 0;
	this.attribute.align = 0; // 0:default left align 1:centeralign
	this.attribute.canvaswidth = 0; // 


	CanvasUI.extend(this.attribute, attribute);

}

/**	Check if the object is an instance of Sprite
 *
 *	static function isInstance
 *	@param {Object} obj
 */
Sprite.isInstance = function( obj ) {
	return obj instanceof Sprite;
}

/**	Initialized sprite call
 *
 *	function init
 */
Sprite.prototype.init = function( canvasui ) {		
	
	this.attribute.image.instance = new Image();
	this.attribute.image.instance.src = this.attribute.image.src;		
	this.attribute.image.instance.onload = this.onReady;
	this.attribute.canvaswidth = (canvasui.layout.width/canvasui.scale);

	this.onCreate();
}


/**	Update the sprite in the canvas
 *
 *	function update
 *	@param {Object} canvasui
 */
Sprite.prototype.update = function( canvasui ) { 
	if( this.attribute.pr ) { return; }	

	this.attribute.pr = true;

	this.cache();
	
	if( this.attribute.align == 1 ) {
		this.attribute.x = this.attribute.canvaswidth/2 - (this.attribute.widthtotal/2);
	}

	this.context['imageSmoothingEnabled'] = false; 

	var vpl = canvasui.viewport.left, vpt = canvasui.viewport.top;

	if( this.attribute.parallax.x == 0 && this.attribute.parallax.y ==0 ) {
		vpl = 0; 
		vpt = 0;
	}
	else {
		vpl = vpl * this.attribute.parallax.x;
		vpt = vpt * this.attribute.parallax.y;	
	}

	for(var i=0;i<this.attribute.container.length;i++){ 			

		this.context.save();	

		this.context.scale(canvasui.scale,canvasui.scale);	
					
		this.context.translate( (this.attribute.x + this.attribute.container[i].xl + vpl ), (this.attribute.y + this.attribute.container[i].yl + vpt ) );
		
		this.context.rotate( this.attribute.angle * Math.PI/180 );

		this.context.globalAlpha = this.attribute.opacity/100;	

		this.context.drawImage( this.attribute.image.instance, 
			this.attribute.container[i].xp, 
			this.attribute.container[i].yp,
			this.attribute.character.width, 
			this.attribute.character.height, 
			this.attribute.origin.x, this.attribute.origin.y,
			this.attribute.width , 
			this.attribute.height  
		);	
				
		this.context.restore();
	}

	this.attribute.pr = false;		
}


/**	Clone the current Sprite instance
 *
 *	function copy
 *	@return {Sprite} cloned instance
 */
Sprite.prototype.copy = function() {
	var sprite = new Sprite( this.attribute );

	// issue a new UUID on the cloned sprite
	sprite.attribute.id = CanvasUI.UUID();	

	// copy the animation sprite 
	// sprite.animation = this.animation;

	// copy all the defined traits on this Sprite
	if( this.trait && Object.keys(this.trait).length>0 ) {
		for (var name in this.trait) { 		
			if( this.trait[ name ] ){	
				sprite.trait[ name ] = this.trait[ name ].copy();			
			}
		} 
	}

	return sprite;
}


/**	Define the cached images in the container
 *
 *	function cache
 */
Sprite.prototype.cache = function() {
	if( this.attribute.image == undefined ) return;

	if( this.attribute.container.length == 0 ) {		
		
		if( this.attribute.image.width == undefined || this.attribute.image.height == undefined ) {
			this.attribute.image.width = this.attribute.image.instance.width;
			this.attribute.image.height = this.attribute.image.instance.height;
		}

		this.attribute.container.push({
			xp:this.attribute.sheet.px*(this.attribute.image.width/this.attribute.sheet.nw), 
			yp:this.attribute.sheet.py*(this.attribute.image.height/this.attribute.sheet.nh), 			
			xl:0,yl:0
		});			
		
	}

	this.attribute.character = {
		width:this.attribute.image.width/this.attribute.sheet.nw,
		height:this.attribute.image.height/this.attribute.sheet.nh 
	};	

	this.attribute.widthtotal = this.attribute.width;
}

/** Sprite callbacks
 */
Sprite.prototype.onCreate = function() {}

Sprite.prototype.onDestroy = function() {}
/** 
 *	
 *	function SpriteFont
 *
 *	@constructor
 *	@extends {Sprite} 
 *	@param attribute
 *	@see {@link CanvasUI}
 *	@see {@link Sprite}  
 */ 
function SpriteFont( attribute ) {

	CanvasUI.extend(this, new Sprite( attribute ));

	this.instancevar = {};
	this.attribute = {		
		character:{ set:'',width:1,height:1,row:1,column:1,spacewidth:{},spacedefault:1 },				
		linespacing:1,		
	};

	for (var attrname in attribute) { this.attribute[attrname] = attribute[attrname]; }	

	// this.attribute.type = 'SpriteFont';

	this.sprite = new Sprite(this.attribute);

	this.attribute = this.sprite.attribute;
	
	this.sprite.cache = this.cache;
	this.sprite.onReady = this.onReady;
	this.sprite.onCreate = this.onCreate;
	this.sprite.onDestroy = this.onDestroy;	
};


SpriteFont.prototype.init = function( canvasui ) { 
	this.sprite.init( canvasui ); 
	this.sprite.context = this.context;
};


SpriteFont.prototype.copy = function() {
	var spriteFont = new SpriteFont( this.attribute );

	spriteFont.attribute.id = CanvasUI.UUID();

	/*
	spriteFont.onReady = this.onReady;
	spriteFont.onCreate = this.onCreate;
	spriteFont.onDestroy = this.onDestroy;
	*/
	
	// copy all the defined traits on this Sprite
	if( this.trait && Object.keys(this.trait).length>0 ) {
		for (var name in this.trait) { 		
			if( this.trait[ name ] ){	
				spriteFont.trait[ name ] = this.trait[ name ].copy();			
			}
		} 
	}


	return spriteFont;
};


SpriteFont.prototype.cache = function() {			
	if( this.attribute.container.length == 0 ) {  
		var xl = 0, yl = 0, m = this.attribute.character.set, ms = this.attribute.character.spacewidth, ds = this.attribute.character.spacedefault;
		this.attribute.container = [];			
		for(var i=0;i<this.attribute.t.length;i++){ 
			var mi = m.indexOf(this.attribute.t.charAt(i));										
			var xp = Math.floor(mi%this.attribute.character.column)*this.attribute.character.width; // define x-position 
			var yp = Math.floor(mi/this.attribute.character.column)*this.attribute.character.height; // define y-position		 	
			var mw = ds; 
			for(var r in ms){  // define the space width depending on the character
				if( r.indexOf(this.attribute.t.charAt(i)) >-1 ) { 
					mw = ms[r]; 
					break; 
				}
			}														
						
			this.attribute.container.push({xp:xp,yp:yp,xl:xl,yl:yl});
			xl = xl + mw*(this.attribute.width/this.attribute.character.width) + (this.attribute.linespacing*(this.attribute.width/this.attribute.character.width));					
			
		}
		this.attribute.widthtotal = xl;
	}
};


SpriteFont.prototype.set = function(attribute) {
	for (var attrname in attribute) { 
		//if(attrname != 'type'){
		this.sprite.attribute[attrname] = attribute[attrname]; 	
		//}		
	}		
	this.sprite.attribute.container = [];
	this.attribute = this.sprite.attribute	
}


SpriteFont.prototype.setText = function( t ) {
	this.sprite.attribute.t = t+'';
	this.sprite.attribute.container = [];	
	this.attribute = this.sprite.attribute
};	


SpriteFont.prototype.destroy = function() {
	this.sprite.attribute.st = -1;
	this.attribute.st = -1;
}

SpriteFont.prototype.update = function( canvasui ) {
	this.sprite.update( canvasui );	
};


SpriteFont.prototype.onReady = function() {};

SpriteFont.prototype.onCreate = function() {};

SpriteFont.prototype.onDestroy = function() {};

/**	
 *  A makeshift engine as a quick fix and work around just to submit a lost theme game 
 *   
 *  
 *	function TileTowerDefenseEngine
 *	@constructor
 */					
function TileTowerDefenseEngine(){

	
	this._UUID = 0;

	this.tilemap = new Object();

	// Default: Game speed 1 normal, 2 doubled, 0.5 halfed
	this.gamespeed = 1;

	// Default: Game resourced used to create tile 
	this.gameresource = 0;

	// Default: Enemy respawn rate per interval relative to the number of open ground, zero no respawn
	this.enemyrate = 1;

	// Default: Cost of building a tower
	this.towercost = 10;

	// Default: Game state. 0 initialize, 1 start, -1 game over, 2 pause
	this.state = 0;

	// Default: Game update counter
	this.time = 0;

	// Default: Stats counter. t number of towers, m number of enemies, og number of open grounds 
	this.stats = {tower:0, enemy:0, openground:0};
	
};

/**	Generate an incremental UUID
 *	@return {number} incremented value of _UUID
 */ 
TileTowerDefenseEngine.prototype.UUID = function(){
	return this._UUID++;
};

/**	Inclusive between values	
 *	@param {number} min minimum value range
 *	@param {number} max maximum value range
 *	@return {number} between min and max
 */ 
TileTowerDefenseEngine.betweenInt = function(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

/*	Calculator for attrbutes based on the base pow based on x,y coordinates with min,max ranges
	@param 
	@return int, positive number
*/ 
TileTowerDefenseEngine.powRng = function(pow, x, y, min, max) {
    var h = Math.floor( Math.pow(pow, (Math.abs(x)+Math.abs(y)) ) ); 
	return Math.max(TileTowerDefenseEngine.betweenInt(h+min,h+max), 1);
};

/*	Enemy, all defined enemies will peform action on this step
	@param 
	@return 
*/ 
TileTowerDefenseEngine.prototype.enemyAction = function(){ 			
	for(var r in this.tilemap) { // loop in all enemy container adjacent tiles			
		if( this.tilemap[r].enemy !== false ) {							
			var tile_tower = this.checkAdjacent(this.tilemap[r].x, this.tilemap[r].y, 1); // check for adjacent tile. attack if there is adjacent.				
			if( tile_tower === false ) {  // move to the coordinate nearest to the center
				var mt = this.enemyMove(this.tilemap[r].x, this.tilemap[r].y);	
				this.onEnemyMove( this.tilemap[mt.tx+','+mt.ty] );
				this.tilemap[r].la = false;					
			}
			else {						
				// enemy will deal damage to tile
				this.enemyAttack(this.tilemap[r], tile_tower);
				this.tilemap[r].enemy.lastattacked = tile_tower;
				this.onEnemyAttack(this.tilemap[r], tile_tower);
			}
		}
	}
};


/*	Enemy, create enemy in a blank open ground
	@param 
	@return 
*/ 
TileTowerDefenseEngine.prototype.enemyCreate = function(){ 

	if( this.time % this.enemyrate != 0 ) return false; // create enemy based on the rate

	if( this.stats.openground < 24 ) return false; // ensure that the open ground is more than 10

	var mec = Math.max(1,Math.floor( this.stats.openground / 25 )); // total enemies to be created per 25 open ground

	var arm = []; // list of key coordinate that enemy can spawn into
	
	for(var r in this.tilemap) { // loop in all enemy container adjacent tiles			

		if( this.tilemap[r].type === 0 && this.tilemap[r].enemy === false ) {
			arm.push( this.tilemap[r] );
		}
	}

	// return false if arm space is empty
	if(arm.length <= 0) { return false;	} 

	arm.sort(function(a, b) {
		var axy = Math.abs(a.x)+Math.abs(a.y), bay = Math.abs(b.x)+Math.abs(b.y);
		if (axy > bay) return -1;
		if (axy < bay) return 1;
		return 0;
	});

	// create enemy based on the total enemies allowed 
	for(var i=0; i<mec; i++) { 
		if(mec>3) arm.length = 3;

		var k = arm[Math.floor(Math.random() * arm.length)];				
		
		switch( TileTowerDefenseEngine.betweenInt(0,1) ) {
			case 0: k.enemy = this.enemyCreateTank( k ); break;
			case 1: k.enemy = this.enemyCreateDps( k ); break;
		}

		this.onEnemyCreate( k );	
	}		

	return true;
	
};

/*	Enemy, create enemy tank character
	@param object tile entry definition
	@return 
*/ 
TileTowerDefenseEngine.prototype.enemyCreateTank = function( tm ){ 
	return { 
		id: this.UUID(), 
		health: TileTowerDefenseEngine.powRng(1.1, tm.x, tm.y, 0, 3), 
		attack: TileTowerDefenseEngine.powRng(1.076, tm.x, tm.y, -3, 0), 
		defense: 1,
		speed: 1 };
};

TileTowerDefenseEngine.prototype.enemyCreateDps = function( tm ){ 	
	return { 
		id: this.UUID(), 
		health: TileTowerDefenseEngine.powRng(1.05, tm.x, tm.y, 0, 2), 
		power: TileTowerDefenseEngine.powRng(1.09, tm.x, tm.y, -3, 0), 
		defense: 1,
		speed:1 };
};

/*	Enemy, perform attack
	@param m enemy tile
	@param t tile coodinate		
*/ 
TileTowerDefenseEngine.prototype.enemyAttack = function(tile_enemy, tile_tower){

	tile_tower.tower.health -= Math.max(tile_enemy.enemy.attack - tile_tower.tower.defense, 1);

	tile_enemy.enemy.lastattacked = { x:tile_tower.x, y:tile_tower.y };

	//if( tile_tower.tower.health <= 0 ) { // dead enemy, gets a tile reset		
		this.onTowerDestroy( tile_tower );
		this.tileReset(tile_tower.x, tile_tower.y);
	//}

};


/*	Enemy, move to the new tile area			
	@param x,y current tile
	@return boolean move successfully
*/ 
TileTowerDefenseEngine.prototype.enemyMove = function(x,y){
	var tx=0,ty=0;

	if( x!=0 && Math.random() > 0.5 ) {
		tx = x<0 ? x+1 : x-1;
	}
	else if( y!=0 ) {
		ty = y<0 ? y+1 : y-1;
	}
	else {
		tx = x<0 ? x+1 : x-1;	
	}
	
	if( this.enemySwap(x,y,tx,ty, false) ) {
		return {tx:tx,ty:ty};
	}
	return {tx:x,ty:y};
};


/*	Enemy, move or swap the enemy to the new tile area			
	@param x,y current tile
	@param tx,ty target tile to move to
	@param s boolean false = no swapping, true enemy can change position
	@return boolean move successfully
*/ 
TileTowerDefenseEngine.prototype.enemySwap = function(x,y,tx,ty,s){
	if( this.tilemap[tx+','+ty] && this.tilemap[tx+','+ty].type==0 && (this.tilemap[tx+','+ty].enemy === false || s)) {
		var v = this.tilemap[tx+','+ty].enemy;
		this.tilemap[tx+','+ty].enemy = this.tilemap[x+','+y].enemy; // TODO: Need to do clone instead. might affect
		this.tilemap[x+','+y].enemy = v;	
		return true;
	}
	return false;			
};



/*	
	@param 
	@return 
*/ 
TileTowerDefenseEngine.prototype.towerAction = function(){ 			
	// loop in all tiles and do the required action
	for(var r in this.tilemap) { 
		if( this.tilemap[r].type === 1 &&  this.tilemap[r].tower !== false ) { 
			// resource tower, add to global resource
			if( this.tilemap[r].tower.resource > 0 ) {
				this.gameresource += this.tilemap[r].tower.resource;
				this.onTowerResource( this.tilemap[r] );	
			}
			// attack tower, search for adjacent enemy
			if( this.tilemap[r].tower.attack > 0 ) {
				var tile_enemy = this.checkAdjacent(this.tilemap[r].x, this.tilemap[r].y, 0); // check for adjacent tile with enemy					
				if( tile_enemy !== false ) {
					this.towerAttack(this.tilemap[r], tile_enemy);
					this.onTowerAttack(this.tilemap[r], tile_enemy);	
				}			
			}
		}
	}
};	

TileTowerDefenseEngine.prototype.hit = function( a ){ 			
	if( this.tilemap[a.x+','+a.y] == undefined || this.tilemap[a.x+','+a.y] == false ) { 
		return {status:4}; // tile is too far or not an open ground tile
	} 

	if( this.tilemap[a.x+','+a.y].enemy !== false ) { 
		var tile_enemy = this.tilemap[a.x+','+a.y];
		this.onEnemyDestroy( tile_enemy );
		this.tileReset(tile_enemy.x, tile_enemy.y);
		return { status:3, enemy:this.tilemap[a.x+','+a.y].enemy }; // tile has an active enemy
	} 

	if( this.tilemap[a.x+','+a.y].tower !== false ) { 
		return { status:2, tower:this.tilemap[a.x+','+a.y].tower }; // tile has an active tower
	} 

	if( this.gameresource < this.towercost ) { // not enough resource to build tower
		return { status:5 };
	}
	// deduct total resource
	this.gameresource -= 1;

	return { status:1, tower:this.tilemap[a.x+','+a.y].tower };
};




/*	
	@param 
	@return 
*/ 
// attribute = {l:0,x:0,y:0,t:1}  @param l: level, t: 0=openground 1=resource 2=defense 3=attack, x,y coodinate = {l:0,x:0,y:0,t:0,h:0,p:0,r:0,m:false} 
TileTowerDefenseEngine.prototype.towerCreate = function( a ){ 			
	if( this.tilemap[a.x+','+a.y] == undefined || this.tilemap[a.x+','+a.y] == false ) { 
		return {status:4}; // tile is too far or not an open ground tile
	} 

	if( this.tilemap[a.x+','+a.y].enemy !== false ) { 
		var tile_enemy = this.tilemap[a.x+','+a.y];
		this.onEnemyDestroy( tile_enemy );
		this.tileReset(tile_enemy.x, tile_enemy.y);
		return { status:3, enemy:this.tilemap[a.x+','+a.y].enemy }; // tile has an active enemy
	} 

	if( this.tilemap[a.x+','+a.y].tower !== false ) { 
		return { status:2, tower:this.tilemap[a.x+','+a.y].tower }; // tile has an active tower
	} 

	if( this.gameresource < this.towercost ) { // not enough resource to build tower
		return { status:5 };
	}

	// create tower in the open ground tile
	a.enemy = false;	
	this.tilemap[a.x+','+a.y] = a; 

	// create the adjacent tiles to open ground
	this.tileAdjacentCreateOpenGround(a.x,a.y,1); 

	// callback onTowerCreate
	this.onTowerCreate( this.tilemap[a.x+','+a.y] );

	// deduct total resource
	this.gameresource -= this.towercost;

	return { status:1, tower:this.tilemap[a.x+','+a.y].tower };
};


/*	This assume that param t, m have prior validation
	param m enemy tile
	param t tile coodinate
*/ 
TileTowerDefenseEngine.prototype.towerAttack = function(tile_tower, tile_enemy){
	
	tile_enemy.enemy.health -= Math.max(tile_tower.tower.attack - tile_enemy.enemy.defense, 1);

	tile_tower.tower.lastattacked = { x:tile_enemy.x, y:tile_enemy.y };

	if( tile_enemy.enemy.health <= 0 ) { // dead enemy, gets a tile reset		
		this.onEnemyDestroy( tile_enemy );
		this.tileReset(tile_enemy.x, tile_enemy.y);
	}
	


};


/*	After the tile is created identify the surrounding adjacent tiles, create open ground tiles	
	@param 
	@return 
*/ 
TileTowerDefenseEngine.prototype.tileAdjacentCreateOpenGround = function(x,y,r){ 			
	var ad = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:-1,y:1},{x:1,y:-1},{x:-1,y:-1},{x:1,y:1}];
	for(var i=0;i<ad.length;i++){
		ad[i].x+=x; ad[i].y+=y;

		if( this.tilemap[ad[i].x+','+ad[i].y] === undefined ) { // create openground tile								
			this.tileReset(ad[i].x, ad[i].y);
		}				

		if( this.tilemap[ad[i].x+','+ad[i].y].type==0 && r>0) {			
			this.tileAdjacentCreateOpenGround(ad[i].x, ad[i].y, r- 1);
		}
	}
	
};

/*	Tile, reset to open ground
	@param 	
*/ 
TileTowerDefenseEngine.prototype.tileReset = function(x,y) {	
	this.tilemap[x+','+y] = { x:x, y:y, type:0, enemy:false, tower:false };
	this.onTileReset( this.tilemap[x+','+y] );		
}

/*	Tile, Compute for the tile statistics
*/ 
TileTowerDefenseEngine.prototype.tileCountStats = function() {		
	this.stats = {tower:0,enemy:0,openground:0};
	for(var r in this.tilemap) {
		if( this.tilemap[r].type === 0 ) this.stats.openground++;
		if( this.tilemap[r].tower != false ) this.stats.tower++;
		if( this.tilemap[r].enemy != false ) this.stats.enemy++;
	}
}



/**	
 *
 *	function update
 *	@param x,y object center coodinate
 *	@param t int type 0-check for enemy 1-check for player 
 *	@return mixed boolean false | object adjacent coordinate {x,y} with enemy or player
 */
TileTowerDefenseEngine.prototype.checkAdjacent = function(x,y,t){ 
	var ad = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1},{x:-1,y:1},{x:1,y:-1},{x:-1,y:-1},{x:1,y:1}];
	for(var i=0;i<ad.length;i++){
		ad[i].x+=x; ad[i].y+=y;
		if( t==0 && this.tilemap[ad[i].x+','+ad[i].y]!=undefined && this.tilemap[ad[i].x+','+ad[i].y].enemy !== false ) {
			return this.tilemap[ad[i].x+','+ad[i].y];
		}
		else if( t==1 && this.tilemap[ad[i].x+','+ad[i].y]!=undefined && this.tilemap[ad[i].x+','+ad[i].y].tower !== false ) {
			return this.tilemap[ad[i].x+','+ad[i].y];
		}				
	}
	return false;
};


/**	Trigger game start, calls the cyclic update
 *
 *	function start
 */
TileTowerDefenseEngine.prototype.start = function(){ 
	this.state = 1;
	this.onStart();
	this.update();
};

TileTowerDefenseEngine.prototype.play = function(){ 
	this.gamespeed = 0.6;
	this.gameresource = this.towercost;	
	this.enemyrate = 4;					
	this.tilemap = { '0,0':{ type:0, x:0, y:0, tower:false, enemy:false } };
	this.tileReset(0,0);
	this.towerCreate({ x:0, y:0, type:1, tower:{ health:2, attack:2, resource:2 } });							
	this.start();		
};	


/**	Perform game update on the different phases
 *
 *	function update
 */
TileTowerDefenseEngine.prototype.update = function(){ 
	var self = this;

	self.towerAction();

	self.tileCountStats();
	
	self.enemyAction();

	self.tileCountStats();
	
	self.gameover();
	
	self.enemyCreate();

	self.tileCountStats();

	self.onUpdate();	

	if( self.gamespeed > 0 && self.state == 1 ) {
		setTimeout(function(){
			self.update();
		},(1000/self.gamespeed) );	
	}			

	self.time++;
};

TileTowerDefenseEngine.prototype.pause = function(){ 
	if( this.state == 1 ) { this.state = 2; }	
};

TileTowerDefenseEngine.prototype.resume = function(){ 
	this.state = 1;
	this.update();
}



/** Check the gameover state and perform gameover event callback
 *
 *	function gameover 
 *	@return {boolean} true if game has ended
 */
TileTowerDefenseEngine.prototype.gameover = function(){ 

	if( this.stats.tower > 0 ) return false; 

	this.state = -1;

	this.onGameover();

	return true;
};


/**	Callback place holders
 *	
 */ 
TileTowerDefenseEngine.prototype.onStart = function(){};

TileTowerDefenseEngine.prototype.onUpdate = function(){};

TileTowerDefenseEngine.prototype.onEnemyCreate = function( m ){};

TileTowerDefenseEngine.prototype.onEnemyAttack = function( m, tw ){};

TileTowerDefenseEngine.prototype.onEnemyDestroy = function( m ){};

TileTowerDefenseEngine.prototype.onEnemyMove = function( m ){};

TileTowerDefenseEngine.prototype.onTowerCreate = function( tw ){};

TileTowerDefenseEngine.prototype.onTowerResource = function( tw ){};

TileTowerDefenseEngine.prototype.onTowerAttack = function( tw, m ){};

TileTowerDefenseEngine.prototype.onTowerDestroy = function( tw ){};

TileTowerDefenseEngine.prototype.onTileReset = function( tm ){};

TileTowerDefenseEngine.prototype.onGameover = function(){};
/**	Controller that link different app components, game engine and canvasui.
 *	
 *	function BaseApp
 *	@constructor
 *	@see {Resource}
 */
function BaseApp() { 
	this.state = 0.0;
	this.globalvar = {};

	// polyfill for extended browser support
	this.polyfill();

	// engine core processes
	this.engine = {}

	// engine canvasui processes
	this.canvasui = new CanvasUI();
	this.service = {};
	this.component = {};

	// display loader
	this.loader = new Loader();	
	this.loader.context = this.canvasui.context;

}

/**	Initialize resources
 *
 *	function initialize
 */
BaseApp.prototype.initialize = function() {	
	var self = this;	

	this.state = 0.1;	

	// perform decompression of image files
	Resource.vectori();

	// peform decompression of sound files
	Resource.sound();

	// once all the resources are loaded switch to the given state
	Resource.complete( function(){
		self.state = 1.0;		
	} );	
}

/**	
 *
 *	function appInitialize
 */
BaseApp.prototype.appInitialize = function() {
	this.state = 1.1;
	this.hud = new Hud( this );
	this.menu = new Menu( this );
	this.state = 2.0;
}

/**	Initialize Engine
 *
 *	function engineInitialize
 */
BaseApp.prototype.engineInitialize = function() {
	this.state = 2.1;

	this.state = 3.0;
}

/**	Initialize Services
 *
 *	function servicesInitialize
 */
BaseApp.prototype.servicesInitialize = function() {
	// 
	this.state = 3.1;

	this.state = 4.0;
}

/**	Initialize Components
 *
 *	function componentsInitialize
 */
BaseApp.prototype.componentsInitialize = function() {
	// initialize components, define behaviours
	this.state = 4.1;

	this.state = 5.0;
}

/**	Define Engine Processes, Callbacks
 *
 *	function engineProcess
 */
BaseApp.prototype.engineProcess = function() {
	this.state = 5.1;

	this.state = 6.0;
}

/**	Define Service Processes, Callbacks
 *
 *	function servicesProcess
 */
BaseApp.prototype.servicesProcess = function() {
	this.state = 6.1;

	this.state = 7.0;
}

/**	Define Component Processes and Traits
 *
 *	function componentsProcess
 */
BaseApp.prototype.componentsProcess = function() {
	this.state = 7.1;

	this.state = 8.0;
}

/**	Schedule the initialization sequence
 *
 *	function schedule
 */
BaseApp.prototype.schedule = function() {
	var self = this;
	setTimeout(function(){
		switch( self.state ) {
			case 0.0: 
				self.loader.percentage( 5 );
				self.initialize();
				self.loader.percentage( 20 );				
				break;
			case 1.0: 
				self.appInitialize();
				self.loader.percentage( 30 );
				break;
			case 2.0: 
				self.engineInitialize();
				self.loader.percentage( 40 );
				break;
			case 3.0: 
				self.servicesInitialize();
				self.loader.percentage( 50 );
				break;
			case 4.0: 
				self.componentsInitialize();
				self.loader.percentage( 60 );
				break;
			case 5.0: 
				self.engineProcess();
				self.loader.percentage( 70 );
				break;
			case 6.0: 
				self.servicesProcess();
				self.loader.percentage( 80 );
				break;
			case 7.0: 
				self.componentsProcess();
				self.loader.percentage( 95 );
				break;
			case 8.0: 								
				self.loader.percentage( 100 ); // definitions complete
				self.state = 9.0;
				setTimeout( self.onReady, 1000 );
				break;
			default: // no action just skip
				break;
		}

		// rerun the scheduler
		if( self.state != 9.0 ) { self.schedule(); }			
	},100);	
}


/**	Start initialization
 *
 *	function start
 */
BaseApp.prototype.start = function() {
	this.schedule();
}


/**	Triggers when initialization is completed, and is ready
 *
 *	function onReady
 */
BaseApp.prototype.onReady = function() {	 }


/**	To extend further browser support BaseApp defined the required 
 *	polyfill prototypes
 *
 *	function polyfill
 */
BaseApp.prototype.polyfill = function() {
	// 1. startsWith polyfill for IE support
	if (!String.prototype.startsWith) {
		String.prototype.startsWith = function(searchString, position) {
			position = position || 0;
			return this.indexOf(searchString, position) === position;
		};
	}
}
/**	
 *
 *	@constructor
 *	function Loader
 */
function Loader() { 

	var self = this;	

	var gradual = function(){
		if( self.currentvalue < self.maxvalue ) {
			self.currentvalue += 0.1;			
		}

		if( self.maxvalue == 100 ) {
			self.currentvalue = 100;
		}
		else {
			setTimeout(gradual,10);	
		}		

		if( self.context && self.context.canvas) {
			self.context.clearRect(0, 0, self.context.canvas.width, self.context.canvas.height);
			self.context.font="16px Georgia, Arial";
			self.context.fillStyle = '#ddd';
			self.context.fillText('LOADING ' + Math.floor(self.currentvalue) + '%',10,50);	
		}
		
	}

	gradual();
}

Loader.prototype.context = {};

Loader.prototype.currentvalue = 0.0

Loader.prototype.maxvalue = 0.0

/**	Úpdate the current progress value
 *
 *	function percentage
 */
Loader.prototype.percentage = function( value ) {	
	CanvasUI.log('Loader.percentage:', value);
	this.currentvalue = this.maxvalue;
	this.maxvalue = value;	
}/** Standard Head on display template
 *
 *	Function Hud
 *  
 *	@constructor
 *	@see CanvasUI, Sprite, Spritefont, Mouse
 */	
function Hud( app ) {
	this.app = app;	
}


Hud.prototype.start = function() {
	var self = this;	

	this.sf_base = this.app.component.spritefont.copy();	
	this.sf_base.set({layer:5, width:16, height:16, parallax:{x:0,y:0}, align:1, 
		image:Resource.getImage('sf2') });	

	this.sf_head = this.sf_base.copy();
	this.sf_head.set({id:'h1',t:'towerq0  energyq0',y:12});	

	this.sf_info = this.sf_base.copy();
	this.sf_info.set({id:'h2',t:'',y:32,image:Resource.getImage('sf1')});	

	this.app.canvasui.addComponent( this.sf_head );
	this.app.canvasui.addComponent( this.sf_info );



	setInterval(function(){
		self.sf_head.setText('towerq'+self.app.engine.stats.tower+' enemyq'+self.app.engine.stats.enemy+' energyq'+self.app.engine.gameresource+' areaq'+self.app.engine.stats.openground);
		if(self.app.engine.gameresource > 10) {
			self.sf_info.setText('tower ready');	
		}
		else {
			self.sf_info.setText('');
		}
		
	},100);
	

	this.app.service.mouse.addComponentMouseDownListener('h1',function(mouse, component){		
			self.app.menu.state = 1;

			setTimeout(function(){
				var layer4 = self.app.canvasui.getComponentsByLayer(4)
	
				for(var i=0;i<layer4.length;i++){
					layer4[i].trait.moveto.y = layer4[i].attribute.y+20 ;
					layer4[i].trait.moveto.enabled = true;
					layer4[i].trait.fade.opacity = 100;
					layer4[i].trait.fade.enabled = true;
				}				
		
			},100);
		
			self.app.engine.pause();	
		
	});

	// display kills

	// display total crystal

	// display total tower

	// display total resource

	// tower: energy: crystal: setting:

}/** Standard Menu Template
 *
 *	Function Menu  
 *
 *	@constructor
 *	@see CanvasUI, Sprite, Spritefont, Mouse
 */		
function Menu( app ) {
	this.app = app;	
	this.state = 0; // 0: not displayed 1: displayed 2: clicked 3: waiting
}

/**
 *
 */
Menu.prototype.start = function() {
	var self = this;	

	var position_bottom = (this.app.canvasui.layout.height/this.app.canvasui.scale);

	this.sf_h1_base = this.app.component.spritefont.copy();	
	this.sf_h1_base.set({layer:4, width:64, height:64, parallax:{x:0,y:0}, align:1, 
		image:Resource.getImage('sf1') });	
	
	this.sf_p_base = this.sf_h1_base.copy();	
	this.sf_p_base.set({width:32, height:32 });

	this.btn_base = this.app.component.button.copy();
	this.btn_base.set({layer:4, parallax:{x:0,y:0}, align:1 });

	this.sf_title = this.sf_h1_base.copy();
	this.sf_title.set({id:'m1',t:'adrift',y:90});		
		
	this.sf_play = this.sf_p_base.copy();
	this.sf_play.set({id:'m3', t:'play', y:( this.sf_title.attribute.y+90+60 ) });
	
	this.sf_sound = this.sf_p_base.copy();
	this.sf_sound.set({id:'m4', t:'sound off', y:( this.sf_play.attribute.y+32+60 ) });

	this.sf_story1 = this.sf_p_base.copy();
	this.sf_story1.set({id:'m5', t:'lost in in the abyss', width:14, height:14, y:( this.sf_sound.attribute.y+32+60 ) });

	this.sf_story2 = this.sf_story1.copy();
	this.sf_story2.set({id:'m6', t:'adrifted from an unknown world', y:( this.sf_story1.attribute.y+16 ) });

	this.sf_story3 = this.sf_story2.copy();
	this.sf_story3.set({id:'m7', t:'survive gather and find energy', y:( this.sf_story2.attribute.y+16 ) });

	this.sf_story4 = this.sf_story3.copy();
	this.sf_story4.set({id:'m8', t:'protect your tower', y:( this.sf_story3.attribute.y+26 ), image:Resource.getImage('sf3') });
	
	this.sf_story5 = this.sf_story4.copy();
	this.sf_story5.set({id:'m9', t:'click monster to destory', y:( this.sf_story4.attribute.y+16 ) });
	
	this.sf_credits1 = this.sf_p_base.copy();
	this.sf_credits1.set({id:'c1', t:'developer', width:14, height:14, image:Resource.getImage('sf2'), y:( position_bottom - 64 ) });
	
	this.sf_credits2 = this.sf_credits1.copy();
	this.sf_credits2.set({id:'c2', t:'pinoypixel', y:( this.sf_credits1.attribute.y+14+4 ) });

	this.btn1 = this.btn_base.copy();
	this.btn1.set({ id:'b1', y:this.sf_play.attribute.y-20});		
	
	this.btn2 = this.btn_base.copy();
	this.btn2.set({ id:'b2', y:this.sf_sound.attribute.y-20})

	this.app.service.mouse.addComponentMouseDownListener('b1',function(mouse, component){		

		// start game
		if( self.state == 1 && (self.app.engine.state == 0 || self.app.engine.state == 2 || self.app.engine.state == -1) ) {
			self.state = 2;
			
			setTimeout(function(){
				var layer4 = self.app.canvasui.getComponentsByLayer(4);
	
				for(var i=0;i<layer4.length;i++){
					layer4[i].trait.fade.destroyOnFadeOut=false;
					layer4[i].trait.moveto.y = layer4[i].attribute.y-20 ;
					layer4[i].trait.moveto.enabled = true;
					layer4[i].trait.fade.opacity = 0;
					layer4[i].trait.fade.enabled = true;
				}

				self.state = 0;

				setTimeout(function(){
					if( self.app.engine.state == 0 ) {
						self.app.engine.play();	

						self.sf_title.setText('pause');
						self.sf_play.setText('resume');	
					}
					else if( self.app.engine.state == 2 ) {
						self.app.engine.resume();	
					}				
					else if( self.app.engine.state == -1 ) {
						var layer1 = self.app.canvasui.getComponentsByLayer(1);
						for(var i=0;i<layer1.length;i++){
							layer1[i].destroy();
						}
						var layer0 = self.app.canvasui.getComponentsByLayer(0);
						for(var i=0;i<layer0.length;i++){
							layer0[i].destroy();
						}

						self.app.engine.play();							

					}
				},400);					
			},100);
		}				
	});


	this.app.service.mouse.addComponentMouseDownListener('b2',function(mouse, component){		
		
		if( self.app.service.sound.attribute.isplaying ) {
			self.app.service.sound.stop();	
			self.sf_sound.setText(' sound on ');				
		}
		else {
			self.app.service.sound.play('default');	
			self.sf_sound.setText('sound off');	
		}

	});


	this.app.canvasui.addComponent( this.btn1 );
	this.app.canvasui.addComponent( this.btn2 );

	this.app.canvasui.addComponent( this.sf_title );
	this.app.canvasui.addComponent( this.sf_play );
	this.app.canvasui.addComponent( this.sf_sound );
	this.app.canvasui.addComponent( this.sf_story1 );
	this.app.canvasui.addComponent( this.sf_story2 );
	this.app.canvasui.addComponent( this.sf_story3 );
	this.app.canvasui.addComponent( this.sf_story4 );
	this.app.canvasui.addComponent( this.sf_story5 );
		
	this.app.canvasui.addComponent( this.sf_credits1 );
	this.app.canvasui.addComponent( this.sf_credits2 );
	

	this.state = 1;

}

Menu.prototype.destroy = function(x, y) {

}	

Menu.prototype.isClickMenu = function(x, y) {

}

Menu.prototype.evtStartScreen = function() {

}

Menu.prototype.evtGameoverScreen = function() {

}

Menu.prototype.evtPauseScreen = function() {

}

Menu.prototype.createMainTitle = function(){

}

Menu.prototype.createPauseTitle = function(){}

Menu.prototype.createGameoverTitle = function(){}

Menu.prototype.createStartButton = function(){}

Menu.prototype.createRetryButton = function(){}

Menu.prototype.createResumeButton = function(){}

Menu.prototype.createCredits = function(){}

Menu.prototype.createShare = function(){}
/**	Controller that link different app components, game engine and canvasui.
 *	
 *	function App
 *	@constructor
 *	@extends {BaseApp}
 *	@see {Resource}
 */
function App() { 

	// extend the base application
	CanvasUI.extend( this, new BaseApp() );

	// engine core processes
	this.engine = new TileTowerDefenseEngine();

	// background color to #000
	this.canvasui.context.canvas.style.background = '#000';
	
	// define the offset
	this.globalvar.offset = Commons.snapToIsoGrid( {x:(this.canvasui.layout.width/this.canvasui.scale)/2,y:(this.canvasui.layout.height/this.canvasui.scale)/2}, 64, 32 );
	
}


/**	Initialize services
 *
 *	function servicesInitialize
 */
App.prototype.servicesInitialize = function() {
	this.state = 3.1;

	this.service.mouse = new Mouse( {} );
	this.canvasui.addService( this.service.mouse );

	// define sound object
	this.service.sound = new Sound({});

	this.service.sound.load( Resource.getSound('default') );

	this.state = 4.0;
}

/**	
 *
 *	function componentsInitialize
 */
App.prototype.componentsInitialize = function() {
	// initialize components, define behaviours
	this.state = 4.1;

	// Grid Component: General purpose isometric grid
	this.component.grid = new Grid( {} )
	this.canvasui.addComponent( this.component.grid );

	// Base Spritefont Component: General purpose sprite
	this.component.spritefont = new SpriteFont({
		name:'sf', height:32, width:32, t:'', linespacing:0, origin:{x:0,y:0},
		image:Resource.getImage('sf1'),
		layer:1, opacity:100,
		character:{
			set:'abcdefghijklmnopqrstuvwxyz0123456789 ',
			width:150,height:150,
			row:6,column:6, 
			//spacewidth:{'i':45,'1':55,'57':80,'l236':90,'hv8':110,'abknopr0':120,'d':130,'mw':140,},
			spacewidth:{'iq':40,'1 ':50,'ty':120,'mw':130,},
			spacedefault:110}		
	});
	this.component.spritefont.trait.fade =  new Fade();
	this.component.spritefont.trait.fade.speed = 10;
	this.component.spritefont.trait.moveto =  new MoveTo();

	// Spritefont for damage display
	this.component.spritefontDamage = this.component.spritefont.copy();
	this.component.spritefontDamage.set({width:16,height:16,image:Resource.getImage('sf3')});
	this.component.spritefontDamage.trait.fade.speed = 2;

	// Sprite for buttons
	this.component.button = new Sprite( { 
		name:'button', height:(150/2), width:(900/2), origin:{x:0,y:0}, 
		image:Resource.getImage('btn'), sheet:{nh:6,nw:1,px:0,py:1},
		layer:0,
		angle:0,
		zIndex:1
	});
	this.component.button.trait.fade = new Fade();
	this.component.button.trait.fade.speed = 10;
	this.component.button.trait.moveto =  new MoveTo();



	this.component.tower = new Sprite( { 
		name:'t', height:62, width:62, origin:{x:-31,y:-31},  //64
		//image:Resource.getImage('tower-1'), sheet:{nh:1,nw:1,px:0,py:0}, 
		//image:Resource.getImage('tower-1-sheet'), sheet:{nh:5,nw:5,px:1,py:0},
		image:Resource.getImage('t'), sheet:{nh:2,nw:2,px:0,py:0},		
		layer:1,
		angle:0,
		zIndex:1
	});
	this.component.tower.trait.fade =  new Fade();
	this.component.tower.trait.animation = new Animation();

	this.component.tower.trait.animation.add({ 
		name:'attack',
		image:Resource.getImage('t'), repeat:false, frameSpeed:5, sheet:{nh:2,nw:2,px:2,py:0}, data:[1,0,1,0,0,2,1,0,1,0,0,1],
	});

	this.component.tower.trait.animation.add({ 
		name:'dead',
		image:Resource.getImage('t'), repeat:false, frameSpeed:5, sheet:{nh:2,nw:2,px:2,py:0}, data:[0,1,3,1,1,3,0,1,3,1,1,3],
	});


	this.component.opengroundt = new Sprite( { 
		name:'g', height:70, width:63, 
		sheet:{nh:5,nw:5,px:0,py:0}, origin:{x:-32,y:-35}, //origin:{x:-32,y:-32}, 
		image:Resource.getImage('g'),
		layer:0,
		collision:false
	});	
	this.component.opengroundt.trait.fade =  new Fade();
	this.component.opengroundt.trait.moveto =  new MoveTo();

	this.component.enemy = new Sprite( { 
		name:'e', height:64, width:64, origin:{x:-32,y:-32}, sheet:{nh:2,nw:2,px:0,py:0},
		image:Resource.getImage('e'),spop:4,spa:4,
		layer:1,
		angle:0,
		zIndex:2
	});						
	this.component.enemy.trait.fade =  new Fade();
	this.component.enemy.trait.moveto =  new MoveTo();
	
	

	this.state = 5.0;
}

/**	
 *
 *	function engineProcess
 */
App.prototype.engineProcess = function() {
	this.state = 5.1;

	var self = this;

	self.engine.onStart = function() {
		CanvasUI.log('onStart', {});
	}

	self.engine.onUpdate = function() {
		CanvasUI.log('onUpdate, stats:', self.engine.stats);
	}

	self.engine.onTowerCreate = function( tilemap ) {
		CanvasUI.log('onTowerCreate', tilemap);

		var iso = Commons.coordinate2dToIso( tilemap, 64, 32, self.globalvar.offset);

		var maintower1 = self.component.tower.copy();
		maintower1.set( iso );

		tilemap.tower.id = maintower1.attribute.id;

		self.canvasui.addComponent( maintower1 );
	}

	self.engine.onTowerAttack = function(tile_tower, tile_enemy) {				
		CanvasUI.log('onTowerAttack dmg=' + tile_tower.tower.attack + ', enemy inflicted ' + tile_enemy.enemy.id + ', position:' + tile_enemy.x + ',' + tile_enemy.y, tile_tower.tower);

		var tower = self.canvasui.getComponentById( tile_tower.tower.id );
		var sfDamage = self.component.spritefontDamage.copy();		

		CanvasUI.log('onTowerAttack, tower=', tower);
		
		tower.trait.animation.play('attack');

		sfDamage.set( Commons.coordinate2dToIso( tile_enemy, 64, 32, self.globalvar.offset) );
		sfDamage.setText(tile_tower.tower.attack);

		self.canvasui.addComponent( sfDamage );

		sfDamage.trait.fade.opacity = 0;
		sfDamage.trait.fade.enabled = true;
		sfDamage.trait.moveto.y = sfDamage.attribute.y-20;
		sfDamage.trait.moveto.enabled = true;
	}

	self.engine.onTowerDestroy = function( tile_tower ) {
		CanvasUI.log('onTowerDestroy', tile_tower);

		var tower = self.canvasui.getComponentById( tile_tower.tower.id )
		// add fade in tower
		
		tower.trait.animation.play('dead');
		setTimeout(function(){
			tower.destroy();
		},1000);

	}


	self.engine.onEnemyCreate = function( tile_enemy ) {
		CanvasUI.log('onEnemyCreate', tile_enemy);

		var iso = Commons.coordinate2dToIso( tile_enemy, 64, 32, false);
		var attr = {x:iso.x+self.globalvar.offset.x,y:iso.y+self.globalvar.offset.y, opacity:10};

		var e1n = self.component.enemy.copy();
		tile_enemy.enemy.id = e1n.attribute.id;
		e1n.set( attr );
		self.canvasui.addComponent( e1n );

		e1n.trait.fade.speed = 5;
		e1n.trait.fade.opacity = 100; //CanvasUI.log('e1n.trait.fade',e1n.trait.fade);
		e1n.trait.fade.enabled = true;
		e1n.instancevar.turn = self.engine.time;								

	}

	self.engine.onEnemyAttack = function(tile_enemy, tile_tower) {
		CanvasUI.log( 'Engine.onEnemyAttack = ', tile_enemy.enemy );
		
		var enemy = self.canvasui.getComponentById( tile_enemy.enemy.id );

		var tower = self.canvasui.getComponentById( tile_tower.tower.id );		

		if( Sprite.isInstance( enemy ) ) {
			// update the instance turn of the enemy sprite, to avoid being recycled			
			enemy.instancevar.turn = self.engine.time;		
			// TODO: trigger enemy attack animation
		}		

		if( Sprite.isInstance( tower ) ) {
			// TODO: trigger tower hit animation
		}
	}

	self.engine.onEnemyMove = function( tile_enemy ) {
		CanvasUI.log('onEnemyMove', tile_enemy);
		var en1 = self.canvasui.getComponentById( tile_enemy.enemy.id )
		var iso = Commons.coordinate2dToIso( tile_enemy, 64, 32, false);
		var pos = {mtx:iso.x+self.globalvar.offset.x,mty:iso.y+self.globalvar.offset.y};

		if( en1 instanceof Sprite ) {
			en1.trait.moveto.enabled = true;
			en1.trait.moveto.speed = 4;
			en1.trait.moveto.x = iso.x+self.globalvar.offset.x;
			en1.trait.moveto.y = iso.y+self.globalvar.offset.y;
			en1.trait.moveto.onMoveTo = function(){ 
				CanvasUI.log('onmoveto complete', en1); 
			}
			

			en1.set(pos);
			en1.instancevar.turn = self.engine.time;

		}

		// set move animation
	}

	self.engine.onEnemyDestroy = function( tile_enemy ) {				
		
		// 1. get enemy from canvas
		var enemy = self.canvasui.getComponentById( tile_enemy.enemy.id )

		if( enemy instanceof Sprite ) {			
			// 2. change animation to destroyed
			// enemy.playAnimation();
			enemy.attribute.sheet.px = 1;
			enemy.attribute.container = [];

			// 3. define fadeout
			enemy.trait.fade.speed = 5;
			enemy.trait.fade.opacity = 0;
			enemy.trait.fade.enabled = true;

			enemy.trait.fade.onFadeOut = function(){
				CanvasUI.log( 'Engine.onEnemyDestroy = ' + tile_enemy.enemy.id + ', fadeout requested.', enemy );
				enemy.destroy();
			}			
		}



	}

	self.engine.onTileReset = function( tm ) {

		// create reset tile if it doesnt exist
		if( self.canvasui.getComponentById( tm.id ) !== false ) return;

		self.engine.tileResetCounter = self.engine.tileResetCounter != undefined ? self.engine.tileResetCounter+1 : 0;

		var iso = Commons.coordinate2dToIso( tm, 64, 32, false);
		var attr = {
			x:iso.x + self.globalvar.offset.x, 
			y:iso.y + self.globalvar.offset.y-640+64*self.engine.tileResetCounter, 
			//y:iso.y+self.globalvar.offset.y,
			opacity:10, sheet:{nh:5,nw:5,px:Commons.betweenInt(0,4),py:Commons.betweenInt(0,1)} };

		var op = self.component.opengroundt.copy();
		tm.id = op.attribute.id;		
		op.set( attr );
		op.attribute.container = [];		
		
		self.canvasui.addComponent( op );				

		// moveto and fade section
		op.trait.fade.speed = 5;
		op.trait.fade.opacity = 100;
		op.trait.fade.enabled = true;
		op.trait.moveto.speed = 20;
		op.trait.moveto.y = iso.y+self.globalvar.offset.y;
		op.trait.moveto.enabled = true;

		op.trait.moveto.onMoveTo = function(){ 
			self.engine.tileResetCounter--;			
		} 

	}	

	self.engine.onGameover = function() {
		CanvasUI.log('onGameover',{});
		
		self.menu.state = 1;


			self.canvasui.getComponentById('m1').setText('gameover');
			self.canvasui.getComponentById('m3').setText('retry');	

			setTimeout(function(){
				var layer4 = self.canvasui.getComponentsByLayer(4)
	
				for(var i=0;i<layer4.length;i++){
					layer4[i].trait.moveto.y = layer4[i].attribute.y+20 ;
					layer4[i].trait.moveto.enabled = true;
					layer4[i].trait.fade.opacity = 100;
					layer4[i].trait.fade.enabled = true;
				}				
		
			},100);
					
	}			



	this.state = 6.0;
}

/**	
 *
 *	function servicesProcess
 */
App.prototype.servicesProcess = function() {
	this.state = 6.1;

	var self = this;

	self.service.mouse.onMouseMove = function( attr ){				
		// implement a draging canavas 
		if( self.engine.state==1 &&  attr.ismousedown  && ( Math.abs(attr.position.fx-attr.position.x)>10 || Math.abs(attr.position.fy-attr.position.y)>10 )) { 		
			self.canvasui.viewport.left -= attr.position.dx/self.canvasui.scale;
			self.canvasui.viewport.top -= attr.position.dy/self.canvasui.scale;
			self.service.mouse.instancevar.hasmoved = true;
		}
	}; 

	self.service.mouse.onMouseDown = function( attr) {
		self.service.mouse.instancevar.hasmoved = false;
	}

	
	self.service.mouse.onMouseUp = function( attr ) {				

		if( self.engine.state==1 && self.service.mouse.instancevar.hasmoved === false ) {
			
			var pos = Commons.snapToIsoGrid( attr.position, 64, 32 ); // snap position					
		
			var d2 = Commons.coordinateIsoTo2d( pos, 64, 32, self.globalvar.offset ); // convert position to 2d coordinate equivalent					
						
			var result = self.engine.hit({x:d2.x, y:d2.y, type:1, tower:{ health:1, attack:0, defense:1, speed:1, resource:0, cost:2 } }); // request to create a tower on the given position

			if( result.status==1 && self.engine.gameresource > 10 ) {

				result = self.engine.towerCreate({x:d2.x, y:d2.y, type:1, tower:{ health:1, attack:0, defense:1, speed:1, resource:0, cost:2 } }); // request to create a tower on the given position
			}

			// note! depending on the result display a popup				
			CanvasUI.log('Requesting to create tower on target position x:'+pos.x+',y'+pos.y,result);

			if( result.status > 1 ) {

				var notice = self.component.spritefont.copy();		
				notice.set( { align:1, y:120, width:26, height:26, parallax:{x:0,y:0}, layer:5 } );
				notice.trait.fade.speed = 4;

				var subnotice = notice.copy();
				subnotice.set({ y:150 });
		
				self.canvasui.addComponent( notice );
				self.canvasui.addComponent( subnotice );				

				switch( result.status ) {
					case 2: notice.setText('area'); subnotice.setText('occupied'); break;
					case 3: 
						notice.setText('enemy spotted'); 
						subnotice.setText('destroy target'); 

					break;
					case 4: notice.setText('tile is too far'); break;
					case 5: notice.setText('not enough energy'); break;
				}	

				notice.trait.fade.opacity = 0;
				notice.trait.moveto.y = notice.attribute.y-20;
				notice.trait.fade.enabled = true;			
				notice.trait.moveto.enabled = true;
				
				subnotice.trait.fade.opacity = 0;
				subnotice.trait.moveto.y = subnotice.attribute.y-20;
				subnotice.trait.fade.enabled = true;			
				subnotice.trait.moveto.enabled = true;				
				
			}
			

		}
		self.service.mouse.instancevar.hasmoved = false;
	}

		
	this.state = 7.0;
}


/**	
 *
 *	window.onload
 */
window.onload = function(e) {  
	var app = new App();
	
	// request to start the application
	app.start();
	
	// request to start the engine and canvas rendering
	app.onReady = function() {				

		app.service.sound.play( 'default' );				

		app.canvasui.start();

		app.menu.start();

		app.hud.start();

		/* cleaning function */
		setInterval(function(){
			var c = 0;
			for (var id in app.canvasui.components) {  
				var cm = app.canvasui.components[id];
				if( cm.instancevar && cm.instancevar.turn && cm.instancevar.turn < app.engine.time-20) {
					CanvasUI.log('Garbage rendering:',cm);
					cm.destroy();
				}
				c++;
			}			
			CanvasUI.log('Total Components:',c);
		},1000); 
	};

	window.blur = function() {
		CanvasUI.log('window on blur should pause.',{});
		app.canvasui.pause();
		app.engine.pause();
	}

	window.focus = function() {
		CanvasUI.log('window on focus should continue.',{})	
		app.canvasui.resume();
		app.engine.resume();
	}
};
