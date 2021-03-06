// Nav
//
// Note we need to take special care to not open up this view multiple times.
// Bootstrap modals do work with multiple modal opens, and that wouldn't make
// sense anyway. We do that via a variable here (doingLogin) that bypasses
// the render here, and is reset by a callback when the modal closes later.
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var UIConfig = require('../../../config/ui.json');
var Login = require('../../../config/login.json');
var LoginController = require('../../login/controllers/login_controller');
var NavTemplate = require('../templates/nav_template.html');
var IdleModal = require('../../../components/modal_idle');
var User = require('../../../../utils/user');

var NavView = Backbone.View.extend({
  events: {
    'click .navbar-brand'                         : linkBackbone,
    'click .nav-link'                             : linkBackbone,
    'click .login'                                : 'loginClick',
    'click .logout'                               : 'logout',
    'click .toggle-one'                           : 'menuClick',
    'click .toggle-two'                           : 'menuClick2',
    'click .subnav-link'                          : 'subMenuClick',
  },

  initialize: function (options) {
    this.options = options;

    this.initializeLoginListeners();
    this.initializeLogoutListeners();
    this.initializeProfileListeners();
  },

  initializeLoginListeners: function () {
    this.listenTo(window.cache.userEvents, 'user:login:success', function (userData) {
      this.doRender({ user: userData });
      this.idleModal = new IdleModal({ el: '#login-wrapper' }).render();
      this.idleModal.resetTimeout();
      var referrer = window.location.search.replace('?','') + window.location.hash;
      Backbone.history.navigate('/' + referrer, { trigger: true, replaceState: true });
    }.bind(this));

    this.listenTo(window.cache.userEvents, 'user:login:close', function () {
      this.doingLogin = false;
    }.bind(this));

    // request that the user log in to see the page
    this.listenTo(window.cache.userEvents, 'user:request:login', function (message) {
      Backbone.history.navigate('/login', {trigger: true});
    });
  },

  initializeLogoutListeners: function () {
    this.listenTo(window.cache.userEvents, 'user:request:logout', function () {
      if(this.idleModal) this.idleModal.cleanup();
      this.logout({});
    }.bind(this));

    this.listenTo(window.cache.userEvents, 'user:logout', function () {
      this.doRender({ user: null });
      Backbone.history.navigate('', {trigger: true});
      this.idleModal.cleanup();
      window.cache.userEvents.trigger('user:logout:success');
    }.bind(this));
  },

  initializeProfileListeners: function () {
    // update the navbar when the profile changes
    this.listenTo(window.cache.userEvents, 'user:profile:save', function (data) {
      $.ajax({
        url: '/api/user',
        dataType: 'json',
      }).done(function (data) {
        // reset the currentUser object
        window.cache.currentUser = new User(data);
        // re-render the view
        this.render();
      }.bind(this));
    }.bind(this));

    // update the user's photo when they change it
    this.listenTo(window.cache.userEvents, 'user:profile:photo:save', function (url) {
      $('.navbar-people').attr('src', url);
    });
  },

  render: function () {
    this.doRender({ user: window.cache.currentUser, systemName: window.cache.system.name });
    if(window.cache.currentUser) {
      this.idleModal = new IdleModal({ el: '#login-wrapper' }).render();
      this.idleModal.resetTimeout();
    }
    return this;
  },

  doRender: function (data) {
    data.login = Login;
    data.ui = UIConfig;
    var template = _.template(NavTemplate)(data);
    this.$el.html(template);
    this.$el.localize();
    this.activePage();
  },

  logout: function (e) {
    if (e.preventDefault) e.preventDefault();
    $.ajax({
      url: '/api/auth/logout?json=true',
    }).done(function (success) {
      window.cache.currentUser = null;
      window.cache.userEvents.trigger('user:logout');
    }).fail(function (error) {
      // do nothing
    });
  },

  activePage: function () {
    $('.usajobs-nav--openopps__section-active').switchClass('usajobs-nav--openopps__section-active', 'usajobs-nav--openopps__section', 0);
    $('.usajobs-openopps-secondary-nav__link').switchClass('is-active', '', 0);
    if (window.cache.currentUser && window.location.pathname.match('profile/' + window.cache.currentUser.id)) {
      this.showSubMenu1();
      this.activateProfile();
    }
    else if (window.location.pathname.match(/admin/)) {
      this.showSubMenu1();
      this.activateAdmin();
    }
    else if (window.location.pathname.match(/profiles\/?$/)) {
      this.showSubMenu2();
      this.activateProfiles();
    }
    else if (window.location.pathname.match(/tasks\/?$/)) {
      this.showSubMenu2();
      this.activateTasks();
    }
  },

  activeSubPage: function () {
    $('.usajobs-openopps-secondary-nav__link').switchClass('is-active', '', 0);
    if (window.cache.currentUser && window.location.pathname.match('profile/' + window.cache.currentUser.id)) {
      //set Profile to active
      $('a[title="Profile"]').addClass('is-active');
    }
    else if (window.location.pathname.match(/admin/)) {
      //set Administration to active
      $('a[title="Administration"]').addClass('is-active');
    }
    else if (window.location.pathname.match(/profiles\/?$/)) {
      //set People to active
      $('a[title="People"]').addClass('is-active');
    }
    else if (window.location.pathname.match(/tasks\/?$/)) {
      //set Opportunities to active
      $('a[title="Opportunities"]').addClass('is-active');
    }
  },

  activateProfile: function () {
    //set Profile to active
    $('a[title="Account"]').addClass('is-active');
    $('a[title="Account"] > span').removeClass('usajobs-nav--openopps__section');
    $('a[title="Account"] > span').addClass('usajobs-nav--openopps__section-active');

    //set Profile to active
    $('a[title="Profile"]').addClass('is-active');
    $('a[title="Profile"] > span').removeClass('usajobs-nav--openopps__section');
    $('a[title="Profile"] > span').addClass('usajobs-nav--openopps__section-active');
  },

  activateAdmin: function () {
    //set Administration to active
    $('a[title="Administration"]').addClass('is-active');
    $('a[title="Administration"] > span').removeClass('usajobs-nav--openopps__section');
    $('a[title="Administration"] > span').addClass('usajobs-nav--openopps__section-active');
  },

  activateProfiles: function () {
    //set People to active
    $('a[title="People"]').addClass('is-active');
    $('a[title="People"] > span').removeClass('usajobs-nav--openopps__section');
    $('a[title="People"] > span').addClass('usajobs-nav--openopps__section-active');
  },

  activateTasks: function () {
    //set Search to active
    $('a[title="Search Opportunities"]').addClass('is-active');
    $('a[title="Search Opportunities"] > span').removeClass('usajobs-nav--openopps__section');
    $('a[title="Search Opportunities"] > span').addClass('usajobs-nav--openopps__section-active');

    //set Opportunities to active
    $('a[title="Opportunities"]').addClass('is-active');
    $('a[title="Opportunities"] > span').removeClass('usajobs-nav--openopps__section');
    $('a[title="Opportunities"] > span').addClass('usajobs-nav--openopps__section-active');
  },

  menuClick: function (e) {
    if (e.preventDefault) e.preventDefault();
    Backbone.history.navigate('/profile/' + window.cache.currentUser.id, {trigger: true});
    this.activePage();
  },

  menuClick2: function (e) {
    if (e.preventDefault) e.preventDefault();
    Backbone.history.navigate('/tasks', {trigger: true});
    this.activePage();
  },

  showSubMenu1: function () {
    $('.toggle-one').attr('data-state', 'is-open');
    $('#section-one').attr('aria-expanded', true);
    $('.usajobs-nav__menu-search.mobile').attr('data-state', 'is-closed');
    $('#section-two').attr('aria-expanded', false);
  },

  showSubMenu2: function () {
    $('.usajobs-nav__menu-search.mobile').attr('data-state', 'is-open');
    $('#section-two').attr('aria-expanded', true);
    $('.toggle-one').attr('data-state', 'is-closed');
    $('#section-one').attr('aria-expanded', false);
  },

  subMenuClick: function (s) {
    if (s.preventDefault) s.preventDefault();
    var link = $(s.currentTarget).attr('href');
    Backbone.history.navigate(link, {trigger: true});
    this.activeSubPage();
  },

  loginClick: function (e) {
    if (e.preventDefault) e.preventDefault();
    Backbone.history.navigate('/login', {trigger: true});
  },

  cleanup: function () {
    this.loginController && this.loginController.cleanup();
    this.idleModal && this.idleModal.cleanup();
    removeView(this);
  },
});

module.exports = NavView;
