/**
 * @author Òscar Casajuana a.k.a. elboletaire <elboletaire at underave dot net>
 * @link https://github.com/elboletaire/password-strength-meter
 */
// eslint-disable-next-line
;(function($) {
  'use strict';

  var Password = function ($object, options) {
    var defaults = {
      customSteps: {
        0: 'Weak; try combining letters & numbers',
        34: 'Medium; try using special characters',
        68: 'Strong password'
      },
      enterPass: 'Type your password',
      showPercent: false,
      showText: true,
      animate: true,
      animateSpeed: 'fast',
      username: false,
      usernamePartialMatch: true,
      containsUsername: 'The password contains the username',
      minimumLength: 4,
      shortPass: 'The password is too short',
      minimumNumbers: 0,
      notEnoughNumbers: 'The Password needs at least 0 numbers',
      minimumSymbols: 0,
      notEnoughSymbols: 'The Password needs at least 0 symbols',
      minimumLetters: 1,
      notEnoughLetters: 'The Password needs at least 1 letters',
      minimumUpperLower: 1,
      notEnoughUpLower: 'The Password needs at least 1 upper and lower char each'
    };

    options = $.extend({}, defaults, options);

    /**
     * Returns strings based on the score given.
     *
     * @param int score Score base.
     * @return string
     */
    function scoreText(score) {
      switch (score) {
        case -6:
          return options.upperLower;
        case -5:
          return options.symbols;
        case -4:
          return options.chars;
        case -3:
          return options.notEnoughNumbers;
        case -2:
          return options.containsUsername;
        case -1:
          return options.shortPass;
        default:
          var { text, ...rest } = options.customSteps;
          // https://github.com/elboletaire/password-strength-meter/pull/6
          for (var stapValue in options.customSteps) {
            if (score >= stapValue) {
              text = options.customSteps[stapValue];
            }
          }
          return text;
      }
    }

    /**
     * Returns a value between -2 and 100 to score
     * the user's password.
     *
     * @param  string password The password to be checked.
     * @param  string username The username set (if options.username).
     * @return int
     */
    function calculateScore(password, username) {
      var score = 0;

      // password length
      if (password.length >= options.minimumLength) {
        score += password.length * 4;
        score += checkRepetition(1, password).length - password.length;
        score += checkRepetition(2, password).length - password.length;
        score += checkRepetition(3, password).length - password.length;
        score += checkRepetition(4, password).length - password.length;
      } else return -1;

      if (options.username) {
        // password === username
        if (password.toLowerCase() === username.toLowerCase()) {
          return -2;
        }
        // password contains username (and usernamePartialMatch is set to true)
        if (options.usernamePartialMatch && username.length) {
          var user = new RegExp(username.toLowerCase());
          if (password.toLowerCase().match(user)) {
            return -2;
          }
        }
      }

      // password has x numbers
      var nums = countPattern(password, '.*[0-9]', options.minimumNumbers);
      if (nums < 0) return -3;
      else if (nums > 0) score += 5;

      // password has x chars
      var chars = countPattern(password, '.*[0-9]', options.minimumLetters);
      if (chars < 0) return -4;

      // password has x symbols
      var symbols = countPattern(password, '([!,@,#,$,%,^,&,*,?,_,~])', options.minimumSymbols);
      if (symbols < 0) return -5;
      else if (symbols > 0) score += 5;

      // password has Upper and Lower chars
      var upLower = countPattern(password, '([a-z].*[A-Z])|([A-Z].*[a-z])', options.needsUpperLower ? 1 : 0);
      if (upLower < 0) return -6;
      else if (upLower > 0) score += 10;

      // password has numbers and chars
      if (nums * chars > 0) {
        score += 15;
      }

      // password has numbers and symbols
      if (nums * symbols > 0) {
        score += 15;
      }

      // password has chars and symbols
      if (chars * symbols > 0) {
        score += 15;
      }

      // password is just numbers or chars
      if ((nums * chars < 1)) {
        score -= 10;
      }

      if (score > 100) {
        score = 100;
      }

      if (score < 0) {
        score = 0;
      }

      return score;
    }

        /**
     * Generic pattern counter
     * https://stackoverflow.com/questions/1072765/count-number-of-matches-of-a-regex-in-javascript
     *
     * @param string password The string to be searched.
     * @param string pattern The pattern to be matched.
     * @param int min the the threshhold to be met.
     * @return int
     */
    function countPattern(password, pattern, min) {
      var res = -1;
      if (((password || '').match(new RegExp(pattern + '/g')) || []).length >= min) {
        res = 1;
      }
      else if (min === 0) {
        res = 0;
      }
      return res;
    }

    /**
     * Checks for repetition of characters in
     * a string
     *
     * @param int rLen Repetition length.
     * @param string str The string to be checked.
     * @return string
     */
    function checkRepetition(rLen, str) {
      var res = "", repeated = false;
      for (var i = 0; i < str.length; i++) {
        repeated = true;
        for (var j = 0; j < rLen && (j + i + rLen) < str.length; j++) {
          repeated = repeated && (str.charAt(j + i) === str.charAt(j + i + rLen));
        }
        if (j < rLen) {
          repeated = false;
        }
        if (repeated) {
          i += rLen - 1;
          repeated = false;
        }
        else {
          res += str.charAt(i);
        }
      }
      return res;
    }

    /**
     * Initializes the plugin creating and binding the
     * required layers and events.
     *
     * @return void
     */
    function init() {
      var shown = true;
      var $text = options.showText;
      var $percentage = options.showPercent;
      var $graybar = $('<div>').addClass('pass-graybar');
      var $colorbar = $('<div>').addClass('pass-colorbar');
      var $insert = $('<div>').addClass('pass-wrapper').append(
        $graybar.append($colorbar)
      );

      $object.parent().addClass('pass-strength-visible');
      if (options.animate) {
        $insert.css('display', 'none');
        shown = false;
        $object.parent().removeClass('pass-strength-visible');
      }

      if (options.showPercent) {
        $percentage = $('<span>').addClass('pass-percent').text('0%');
        $insert.append($percentage);
      }

      if (options.showText) {
        $text = $('<span>').addClass('pass-text').html(options.enterPass);
        $insert.append($text);
      }

      $object.after($insert);

      $object.keyup(function() {
        var username = options.username || '';
        if (username) {
          username = $(username).val();
        }

        var score = calculateScore($object.val(), username);
        $object.trigger('password.score', [score]);
        var perc = score < 0 ? 0 : score;
        $colorbar.css({
          backgroundPosition: "0px -" + perc + "px",
          width: perc + '%'
        });

        if (options.showPercent) {
          $percentage.html(perc + '%');
        }

        if (options.showText) {
          var text = scoreText(score);
          if (!$object.val().length && score <= 0) {
            text = options.enterPass;
          }

          if ($text.html() !== $('<div>').html(text).html()) {
            $text.html(text);
            $object.trigger('password.text', [text, score]);
          }
        }
      });

      if (options.animate) {
        $object.focus(function() {
          if (!shown) {
            $insert.slideDown(options.animateSpeed, function () {
              shown = true;
              $object.parent().addClass('pass-strength-visible');
            });
          }
        });

        $object.blur(function() {
          if (!$object.val().length && shown) {
            $insert.slideUp(options.animateSpeed, function () {
              shown = false;
              $object.parent().removeClass('pass-strength-visible')
            });
          }
        });
      }

      return this;
    }

    return init.call(this);
  }

  // Bind to jquery
  $.fn.password = function(options) {
    return this.each(function() {
      new Password($(this), options);
    });
  };
})(jQuery);
