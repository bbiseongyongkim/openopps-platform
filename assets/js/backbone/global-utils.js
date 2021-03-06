
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

Backbone.history.on('all', function (route, router) {
  window.scrollTo(0, 0);
});

/**
 * Takes a name and pulls the first letter of first name
 * and first letter of last name if it exist. If name is 
 * an empty string it will return an empty string.
 * 
 * @param {string} name name to convert to initials [John J Smith]
 * @returns {string} first and last initial [JS]
 */
global.getInitials = function (name) {
  var initials = name.split(' ').map(function (part) { 
    return part.charAt(0).toUpperCase();
  });
  return initials.length > 2 ? _.first(initials) + _.last(initials) : initials.join('');
};

/**
 * Takes a user id and return an initials color class.
 * 
 * @param {number} id user id [42]
 * @returns {string} initials color class [initials-color-2]
 */
global.getInitialsColor = function (id) {
  return 'initials-color-' + ((id % 5) + 1);
};

/**
 * Helper function to navigate links within backbone
 * instead of reloading the whole page through a hard link.
 * Typically used with the `events: {}` handler of backbone
 * such as 'click .link-backbone' : linkBackbone
 * @param e the event fired by jquery/backbone
 */
global.linkBackbone = function (e) {
  // if meta or control is held, or if the middle mouse button is pressed,
  // let the link process normally.
  // eg: open a new tab or window based on the browser prefs
  if ((e.metaKey === true) || (e.ctrlKey === true) || (e.which == 2)) {
    return;
  }
  // otherwise contain the link within backbone
  if (e.preventDefault) e.preventDefault();
  var href = $(e.currentTarget).attr('href');
  Backbone.history.navigate(href, { trigger: true });
};

/**
 * Organize the tags output into an associative array key'd by their type.
 * If the tag has more than one value for said key, make it an array otherwise
 * keep it as a top level object.
 * @param  {[array]} tags           [array of tags]
 * @return {[object]}               [bindingObject returned out]
 */
global.organizeTags = function (tags) {
  // put the tags into their types
  return _(tags).groupBy('type');
};

/**
 * Completely remove a backbone view and all of its
 * references.  This is needed to destroy the view
 * and all of its listeners, in order to start
 * fresh again and render a new view with a new
 * model.
 *
 * Input:
 * @view the view to be removed, typically called with removeView(this);
 *
 * Return:
 * nothing
 */
global.removeView = function (view) {
  view.undelegateEvents();
  view.$el.html('');
};

global.validatePassword = function (username, password) {
  var rules = {
    username: false,
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
  };
  var _username = username.toLowerCase().trim();
  var _password = password.toLowerCase().trim();
  // check username is not the same as the password, in any case
  if (_username != _password && _username.split('@',1)[0] != _password) {
    rules['username'] = true;
  }
  // length > 8 characters
  if (password && password.length >= 8) {
    rules['length'] = true;
  }
  // Uppercase, Lowercase, and Numbers
  for (var i = 0; i < password.length; i++) {
    var test = password.charAt(i);
    // from http://stackoverflow.com/questions/3816905/checking-if-a-string-starts-with-a-lowercase-letter
    if (test === test.toLowerCase() && test !== test.toUpperCase()) {
      // lowercase found
      rules['lower'] = true;
    }
    else if (test === test.toUpperCase() && test !== test.toLowerCase()) {
      rules['upper'] = true;
    }
    // from http://stackoverflow.com/questions/18082/validate-numbers-in-javascript-isnumeric
    else if (!isNaN(parseFloat(test)) && isFinite(test)) {
      rules['number'] = true;
    }
  }
  // check for symbols
  if (/.*[^\w\s].*/.test(password)) {
    rules['symbol'] = true;
  }
  return rules;
};

/**
 * Validate an input field.  Assumes that there is a data
 * variable in the HTML tag called `data-validate` with the
 * validation options that you want to enforce.
 *
 * email is only meant to allow the value is generally email shaped
 *    it is not bullet proof
 *
 * emaildomain requires a data-emaildomain variable in the HTML tag
 *    it will validate against the value there
 *
 * The input should be in a `required-input` component,
 * and the component should have a .help-text element
 * with a class `.error-[code]` where [code] is the
 * validation rule (eg, `empty`);
 *
 * Expects an object with currentTarget, eg { currentTarget: '#foo' }
 */
global.validate = function (e) {
  var target = (e.currentTarget.classList && e.currentTarget.classList.contains('select2-container')) ? e.currentTarget.nextSibling : e.currentTarget;
  var opts = String($(target).data('validate')).split(',');
  var val = ($(target).prop('tagName') == 'DIV' ? $(target).text().trim() : $(target).val().trim());
  var parent = $(target).parents('.required-input, .checkbox')[0];
  var result = false;
  _.each(opts, function (o) {
    if (o == 'empty') {
      if (!val) {
        $(parent).find('.error-empty').show();
        result = true;
      } else {
        $(parent).find('.error-empty').hide();
      }
      return;
    }
    if (o == 'radio') {
      if ($(target).prop('checked').length <= 0) {
        $(parent).find('.error-radio').show();
        result = true;
      } else {
        $(parent).find('.error-radio').hide();
      }
      return;
    }
    if (o == 'checked') {
      if ($(target).prop('checked') !== true) {
        $(parent).find('.error-checked').show();
        result = true;
      } else {
        $(parent).find('.error-checked').hide();
      }
      return;
    }
    if(o == 'html') {
      if(/[<>]/.test(val)) {
        $(parent).find('.error-html').show();
        result = true;
      } else {
        $(parent).find('.error-html').hide();
      }
      return;
    }
    if (o.substring(0,5) == 'count') {
      var len = parseInt(o.substring(5));
      if (val.length > len) {
        $(parent).find('.error-' + o).show();
        result = true;
      } else {
        $(parent).find('.error-' + o).hide();
      }
      return;
    }
    if (o == 'confirm') {
      var id = $(target).attr('id');
      var newVal = $('#' + id + '-confirm').val();
      if (val != newVal) {
        $(parent).find('.error-' + o).show();
        result = true;
      } else {
        $(parent).find('.error-' + o).hide();
      }
      return;
    }
    if (o == 'button') {
      if (!($($(parent).find('#' + $(target).attr('id') + '-button')[0]).hasClass('btn-success'))) {
        $(parent).find('.error-' + o).show();
        result = true;
      } else {
        $(parent).find('.error-' + o).hide();
      }
    }
    var bits;
    if (o == 'email'){
      var correctLength = false;
      if ( val !== '' && val.indexOf('@') >= 2 ){
        bits = val.split('@');
        var addrBits = bits[1].split('.');
        if ( addrBits.length >=2 ) {
          for (i=0; i<addrBits.length; i++ ){
            if ( addrBits[i].length < 2 ){
              correctLength = false;
              break;
            } else {
              correctLength = true;
            }
          }
        }
      }
      if ( !correctLength || bits[0].length < 2 ) {
        $(parent).find('.error-email').show();
        result = true;
      } else {
        $(parent).find('.error-email').hide();
      }
      return;
    }
    if ( o== 'emaildomain'){
      var domain = $(target).data('emaildomain');
      if ( val !== '' && val.indexOf('@') >= 2 ){
        bits = val.split('@');
        if ( bits[1] != domain ){
          $(parent).find('.error-emaildomain').show();
          result = true;
        } else {
          $(parent).find('.error-emaildomain').hide();
        }
      }
      return;
    }
  });
  if (result === true) {
    $(parent).addClass('usa-input-error');
    $(':button.disable').attr('disabled', 'disabled');
    $(':submit.disable').attr('disabled', 'disabled');
    
  } else {
    $(parent).removeClass('usa-input-error');
    if ($('form').find('*').hasClass('usa-input-error')) {
      $(':button.disable').attr('disabled', 'disabled');
      $(':submit.disable').attr('disabled', 'disabled');
    } else {
      $(':button.disable').removeAttr('disabled');
      $(':submit.disable').removeAttr('disabled');
    }
  }
  return result;
};
