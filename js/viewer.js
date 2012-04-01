/**
 * ...
 * @author Errol Schwartz
 */

(function() {
	
	//MODEL - global app data
	var AppData = Backbone.Model.extend({
		defaults: {
			currentImg: null
		}
	});
	
	//MODEL - data for a single image
	var Img = Backbone.Model.extend({
		defaults: {
			selected: false,
			saved:false,
			rating:0,
			listName:"",
			show: true,
			odd:false
		}
	});
	
	//COLLECTION - set of Img models
	var Imgs = Backbone.Collection.extend({
		model: Img,
		url: 'json/images.json'
	});
	
	//VIEW - a single item in the list
	var ListItem = Backbone.View.extend({
		tagName: 'li',
		template: _.template($('#template-list-item').html()),
		
		//Listen for changes to the model
		initialize: function() {
			_.bindAll(this, 'render');
			this.model.on('change', this.render);
			this.render();
		},
		
		//When the model is changed, replace the template content
		//Add or remove classes to reflect state
		render: function() {
			this.$el.html(this.template(this.model.toJSON()));
			
			if(this.model.get('selected') == true) {
				this.$el.addClass('list-selected');
			} else {
				this.$el.removeClass('list-selected');
			}
			
			if(this.model.get('saved') === true) {
				this.$el.find('.list-saved div').addClass('list-check-holder');
			} else {
				this.$el.find('.list-saved div').removeClass('list-check-holder');
			}
			
			if(this.model.get('show') == false) {
				this.$el.addClass('hidden');
			} else {
				this.$el.removeClass('hidden');
			}
			
			if(this.model.get('odd') == true) {
				this.$el.addClass('list-odd');
			} else {
				this.$el.removeClass('list-odd');
			}
		}
	});
	
	//VIEW - the list of images
	var List = Backbone.View.extend({
		el: $('.list-holder'),
		handle: $('.scroll-handle'),
		
		//Binds some constant click events
		events: {
			'click .list-scrollable-inner': 'itemClick',
			'click .tab-holder': 'tabClick'
		},
		
		//For each model in the collection, create a list item view
		//Set up scrolling listeners
		initialize: function() {
			var t = this, ul = $('<ul>');
			_.bindAll(this, 'render', 'itemClick', 'handleDown', 'handleUp', 'handleMove', 'mouseWheel', 'filterSaved');
			
			this.collection.each( function(img, i) {
				var l = new ListItem( {model: img} );
				if(i%2 == 0) img.set('odd', true);
				ul.append(l.el);
			});
			
			$('.list-scrollable-inner').append(ul);
			this.$el.on('mousewheel', this.mouseWheel);
			this.handle.on('mousedown', this.handleDown);
			this.model.on('change', this.render);
		},
		
		//Select the clicked tab and deselect the other
		//Filter the list contents based on that selection
		//Update the scrollbar
		tabClick: function(e) {
			$('.list-tab').removeClass('tab-selected');
			
			var t = $(e.target).closest('.list-tab');
			t.addClass('tab-selected');
			
			this.filterSaved();
			this.updateListPos(0);
			
			this.$el.off('mousewheel', this.mouseWheel);
			this.handle.off('mousedown', this.handleDown);
			this.handle.addClass('hidden');
			
			if($('.list-scrollable-inner').height() > 318) {
				this.$el.on('mousewheel', this.mouseWheel);
				this.handle.on('mousedown', this.handleDown);
				this.handle.removeClass('hidden');
			}
		},
		
		//Hides or shows list items
		filterSaved: function() {
			var showAll = true, visible = [];
			
			if($('.tab-saved').hasClass('tab-selected')) {
				showAll = false;
			}
			
			this.collection.each( function(img) {
				img.set('odd', false);
				if(showAll == true) {
					img.set('show', true);
					visible.push(img);
				} else {
					if(img.get('saved') == false) {
						img.set('show', false);
					} else {
						img.set('show', true);
						visible.push(img);
					}
				}
			});
			
			for(var i=0; i<visible.length; i++) {
				if(i%2 == 0) visible[i].set('odd', true);
			}
		},
		
		mouseWheel: function(e) {
			var handleMargin, hs;
			hs = this.handle.offset().top - $('.scrollbar').offset().top;
			
			if(e.originalEvent.wheelDelta < 0) {
				handleMargin = Math.min(hs + 20, 254);
			} else {
				handleMargin = Math.min(hs - 20, 254);
			}
			
			this.updateListPos(handleMargin);
		},
		
		handleDown: function(e) {
			e.preventDefault();
			this.handle.off('mousedown', this.handleDown);
			$(window).on('mousemove', this.handleMove);
			$(window).on('mouseup', this.handleUp);
			
			this.mouseStart = e.pageY;
			this.handleStart = this.handle.offset().top - $('.scrollbar').offset().top;
		},
		
		handleMove: function(e) {
			e.preventDefault();
			
			var movement, handleMargin, listPos, p;
			
			movement = e.pageY - this.mouseStart;
			handleMargin = Math.min(this.handleStart + movement, 254);
			
			this.updateListPos(handleMargin);
		},
		
		updateListPos: function(hm) {
			hm = Math.max(hm, 0);
			this.handle.css('marginTop', hm + 'px');
			
			var p, listPos;
			p = Math.max(hm / 254, 0);
			p = Math.min(p, 1);
			listPos = -p * ($('.list-scrollable-inner').height() - 300);
			$('.list-scrollable-inner').css('marginTop', listPos + 'px');
		},
		
		handleUp: function() {
			$(window).off('mousemove', this.handleMove);
			$(window).off('mouseup', this.handleUp);
			this.handle.on('mousedown', this.handleDown);
		},
		
		//Loops through all the thumbnails in the collection
		//Deselects them all, then selects the new one
		render: function() {
			this.collection.each( function(img) {
				img.set('selected', false);
			});
			var m = this.model.get('currentImg');
			m.set('selected', true);
		},
		
		//Updates the url to match the requested image
		itemClick: function(e) {
			e.preventDefault();
			var i = $(e.target).closest('li').index();
			router.navigate('/' + (i + 1), {trigger: true});
		}
	});
	
	//VIEW - control bar for the current image
	var ViewControls = Backbone.View.extend({
		el: $('.view-control-holder'),
		context: {prev:null, next:null},
		
		//Sets the events for the view
		events: {
			'click .prev-arrow': 'prevClick',
			'mouseover .prev-arrow': 'thumbOver',
			'mouseout .prev-arrow': 'thumbOut',
			'click .next-arrow': 'nextClick',
			'mouseover .next-arrow': 'thumbOver',
			'mouseout .next-arrow': 'thumbOut',
			'click .save-icon': 'saveClick',
			'click .rating-holder': 'ratingClick',
			'mouseover .rating-holder': 'ratingOver',
			'mouseout .rating-holder': 'ratingOut',
			'mouseover .info-icon': 'infoOver',
			'mouseout .info-icon': 'infoOut'
		},
		
		initialize: function() {
			_.bindAll(this, 'render', 'prevClick', 'nextClick', 'thumbOver', 'thumbOut', 'setContext');
			this.model.on('change', this.render);
		},
		
		ratingOver: function(e) {
			if($(e.target).hasClass('rating-dot')) {
				var dot = $(e.target).index();
				for(var i=0; i<dot+1; i++) {
					$('.rating-dot').eq(i).addClass('rated');
				}
			}
		},
		
		ratingOut: function(e) {
			if($(e.target).attr('class') != 'rating-holder') {
				var dot = $(e.target).index();
				for(var i=0; i<5; i++) {
					$('.rating-holder li').eq(i).removeClass('rated');
				}
			}
		},
		
		ratingClick: function(e) {
			if($(e.target).attr('id') != 'rating-holder') {
				var dot = $(e.target).index();
				for(var i=0; i<5; i++) {
					$('.rating-holder li').eq(i).removeClass('rated-final');
				}
				for(var j=0; j<dot+1; j++) {
					$('.rating-holder li').eq(j).addClass('rated-final');
				}
				
				this.m.set('rating', dot + 1);
				this.trigger('model_updated');
			}
		},
		
		infoOver: function(e) {
			$('.view-info').clearQueue();
			$('.view-info').animate({opacity: .8});
		},
		
		infoOut: function(e) {
			$('.view-info').clearQueue();
			$('.view-info').animate({opacity: 0});
		},
		
		thumbOver: function(e) {
			var thumb = ($(e.target).hasClass('prev-arrow')) ? $('.prev-thumb') : $('.next-thumb');
			thumb.clearQueue();
			thumb.animate({opacity: 1, marginTop: '0'}, 200);
		},
		
		thumbOut: function(e) {
			var thumb = ($(e.target).hasClass('prev-arrow')) ? $('.prev-thumb') : $('.next-thumb');
			thumb.clearQueue();
			thumb.animate({opacity: 0, marginTop: '65'}, 200);
		},
		
		//Updates the url to match the previous image
		prevClick: function(e) {
			router.navigate('/' + this.context.prev.get('id'), {trigger: true});
		},
		
		//Updates the url to match the next image
		nextClick: function(e) {
			router.navigate('/' + this.context.next.get('id'), {trigger: true});
		},
		
		saveClick: function(e) {
			this.m.set('saved', !this.m.get('saved'));
			this.trigger('model_updated');
			this.render();
		},
		
		//Figures out which img model is previous and next to the current one
		setContext: function() {
			var c = this.collection;
			var cm = this.model.get('currentImg').get('id') - 1;
			
			this.context.prev = (cm - 1 < 0) ? c.at(c.length - 1) : c.at(cm - 1);
			this.context.next = (cm + 1 >= c.length) ? c.at(0) : c.at(cm + 1);
		},
		
		//Updates which next and last models to use
		//Changes the src of the prev and next thumbnail buttons
		//Updates the current image info
		render: function() {
			this.m = this.model.get('currentImg');
			this.setContext();
			$('.prev-thumb img').attr('src', this.context.prev.get('thumbnail'));
			$('.next-thumb img').attr('src', this.context.next.get('thumbnail'));
			
			$('.view-title').html( this.m.get('title') );
			$('.current-image-count').html( this.m.get('id') );
			$('.total-image-count').html( ' / ' + this.collection.length );
			
			if(this.m.get('saved') == true) {
				$('.save-icon').addClass('saved-icon');
			} else {
				$('.save-icon').removeClass('saved-icon');
			}
			
			for(var i=0; i<5; i++) {
				$('.rating-holder li').eq(i).removeClass('rated');
				$('.rating-holder li').eq(i).removeClass('rated-final');
			}
			
			for(var j=0; j<this.m.get('rating'); j++) {
				$('.rating-holder li').eq(j).addClass('rated-final');
			}
		}
	});
	
	//VIEW - main viewing area for images
	var Viewer = Backbone.View.extend({
		el: $('.view-holder'),
		img: $('.image-holder img'),
		info: $('.view-info'),
		
		//Listens for model changes
		//Hides the info panel
		initialize: function() {
			_.bindAll(this, 'render');
			this.model.on('change', this.render);
			this.info.animate({opacity: 0});
		},
		
		//Changes the src of the viewer image to match the currentImg src
		render: function() {
			var m = this.model.get('currentImg');
			this.img.attr('src', m.get('image'));
			this.info.find('p').html(m.get('description'));
		}
	});
	
	//VIEW - main app view
	var ImageViewer = Backbone.View.extend({
		el: $('#app'),
		
		//Creates the app model and listens for changes on it
		//Creates the collection and tells it to fetch and parse it's data
		initialize: function() {
			_.bindAll(this, 'loaded', 'render', 'setBand', 'modelUpdated', 'checkCookie', 'createCookie');
			
			this.model = new AppData();
			this.model.on('change', this.render);
			
			this.collection = new Imgs();
			this.collection.fetch( {success: this.loaded} );
		},
		
		//Gives each model an id equal to it's place in the collection
		//Creates all the other views, and passes in the app model and collection
		//Sets the inital value of the model's currentImg to the first item in the collection
		loaded: function() {
			var m = this.model;
			var c = this.collection;
			var t = this;
			
			//Shortens the image titles if needed
			this.collection.each( function(img, index) {
				img.set('id', index + 1);
				if(img.get('title').length > 14) {
					var shorten = img.get('title').substring(0, 12) + '...';
					img.set('listName', shorten);
				} else {
					img.set('listName', img.get('title'));
				}
			});
			
			this.checkCookie();
			
			$('.list-image-count').html(this.collection.length);
			
			this.list = new List( {model: m, collection: c} );
			this.viewer = new Viewer( {model: m, collection: c} );
			this.controls = new ViewControls( {model: m, collection: c} );
			this.controls.on('model_updated', this.modelUpdated);
			
			startRouter(this.collection.length);
		},
		
		modelUpdated: function() {
			this.list.filterSaved();
			this.createCookie();
		},
		
		createCookie: function() {
			var c, images = [];
			this.collection.each( function(i) {
				if(i.get('saved') == true || i.get('rating') > 0) {
					images.push(i);
				}
			});
			
			c = $.toJSON(images);
			
			$.cookie('bm_viewer', null);
			$.cookie('bm_viewer', c, { path: '/' });
		},
		
		checkCookie: function() {
			var c = $.cookie("bm_viewer");
			if(c != null) {
				var i, rc = $.secureEvalJSON(c);
				for(i=0; i<rc.length; i++) {
					var img = this.collection.at(rc[i].id - 1);
					img.set('saved', rc[i].saved);
					img.set('rating', rc[i].rating);
				}
			}
		},
		
		setBand: function(id) {
			this.model.set('currentImg', this.collection.at(id));
		},
		
		//Changes the title bar text for the current image
		//Always shows the viewer on image change
		render: function() {
			var m = this.model.get('currentImg');
		}
	});
	
	//ROUTER - handles navigation within the app
	var Router = Backbone.Router.extend({
		routes: {
			'' : 'start',
			':id' : 'band'
		},
		images: 0,
		
		initialize: function() {
			_.bindAll(this, 'band');
		},
		
		start: function() {
			router.navigate('/1', {trigger: true});
		},
		
		band: function(id) {
			if(!isNaN(id)) {
				if(id > this.images) {
					this.navigate('/1', {trigger: true});
				} else if(id - 1 < 0) {
					this.navigate('/1', {trigger: true});
				} else {
					app.setBand(id - 1);
				}
			} else {
				this.navigate('/1', {trigger: true});
			}
		}
	});
	
	//Starts the app
	var app = new ImageViewer();
	resize();
	
	var router;
	function startRouter(images){
		router = new Router();
		router.images = images;
		Backbone.history.start({pushState: false, root:'/projects/viewer/'});
	}
	
	$(window).on('resize', resize);
	
	function resize() {
		var hy = Math.min($(window).height() - 742, 0);
		hy = Math.max(hy, -130);
		$('#holder').css({marginTop:hy + 'px'});
		var by = '0px ' + hy + 'px'
		$('body').css({backgroundPosition:by});
	}
	
})();