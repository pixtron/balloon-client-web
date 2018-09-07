/**
 * balloon
 *
 * @copyright   Copryright (c) 2012-2018 gyselroth GmbH (https://gyselroth.com)
 * @license     GPL-3.0 https://opensource.org/licenses/GPL-3.0
 */

import $ from "jquery";
import i18next from 'i18next';
import css from '../styles/style.scss';

var app = {
  id: 'Balloon.App.Notification',
  _loadingMessages: false,
  _messagesLimit: 10,

  preInit: function(core) {
    this.balloon = core;

    this.injectSettings();
    this.injectMessages();
  },

  postInit: function(core)  {
    this.balloon = core;

    this.initializeMessages();
  },

  /** Message Center **/

  /**
   * Inject the container displaying messages
   *
   * @return void
   */
  injectMessages: function() {
    var $contentMessages = $(
      '<li id="fs-notifications" title="'+ i18next.t('app.balloon_app_notification.messages.title') +'">'+
        '<svg class="gr-icon gr-i-alert"><use xlink:href="/assets/icons.svg#alert"></use></svg>'+
        '<div id="fs-notifications-count">0</div>'+
        '<div id="fs-notifications-dropdown-wrap" class="bln-dropdown fs-identity-dropdown">'+
          '<span class="bln-dropdown-spike"></span>'+
          '<div id="fs-notifications-dropdown" class="bln-dropdown-content">'+
            '<div id="fs-notifications-header">'+
              '<h3>'+ i18next.t('app.balloon_app_notification.messages.title') +'</h3>'+
              '<button id="fs-notifications-delete-all" class="fs-button-primary">' + i18next.t('app.balloon_app_notification.messages.delete_all') + '</button>'+
            '</div>'+
            '<div id="fs-notifications-messages-wrap">'+
              '<div id="fs-notifications-no-messages">'+ i18next.t('app.balloon_app_notification.messages.no_messages') +'</div>'+
              '<ul id="fs-notifications-messages"></ul>'+
            '</div>'+
          '</div>'+
        '</div>'+
      '</li>');

    $('#fs-identity-menu').prepend($contentMessages);

    this.$contentMessages = $contentMessages;
    this.$contentMessagesDropdown = this.$contentMessages.find('#fs-notifications-dropdown');
    this.$contentMessagesContainer = this.$contentMessages.find('#fs-notifications-messages');
    this.$contentMessagesCount = this.$contentMessages.find('#fs-notifications-count');
    this.$contentMessagesDeleteAll = this.$contentMessages.find('#fs-notifications-delete-all');
  },

  /**
   * Initialize messages
   *
   * @return void
   */
  initializeMessages: function() {
    this.$contentMessages.off('click.balloon.app.notifications').on('click.balloon.app.notifications', function() {
      var $list = app.$contentMessagesContainer;
      $list.empty();
      $list.scrollTop(0);
      $list.data('fsNotificationsTotalMessages', 0);
      $list.data('fsNotificationsOffset', 0);

      app.$contentMessagesDropdown.removeClass('has-messages');
      app.$contentMessagesDeleteAll.off('click').on('click', function(event) {
        event.preventDefault();
        event.stopPropagation();

        app._deleteAllDisplayedMessages();
      });

      app._displayMessages().done(function(body) {
        //app._displayMessagesInfiniteScroll();
      });
    });
  },

  /**
   * Loads messages from server and adds it to the container
   *
   * @param int offset (optional offset)
   * @param int limit (optional limit)
   * @return void
   */
  _displayMessages: function(offset, limit) {
    app._loadingMessages = true;
    var $list = app.$contentMessagesContainer;
    var limit = limit || app._messagesLimit;
    var offset = offset || $list.data('fsNotificationsOffset');

    var request = app._fetchMessages(offset, limit);

    $list.data('fsNotificationsOffset', (offset + limit))

    request.done(function(body) {
      $list.data('fsNotificationsTotalMessages', body.total);

      if(body.total > 0) {
        app.$contentMessagesCount.html(body.total).show();
        app.$contentMessagesDropdown.addClass('has-messages');

        var messages = body.data;

        for(var i=0; i<messages.length; i++) {
          var message = messages[i];

          var $message = $(
            '<li data-fs-message-id="' + message.id + '">'+
              '<p class="fs-notifications-meta">' + i18next.t('app.balloon_app_notification.messages.message_meta', message.sender.username) + '</p>'+
              '<h4>' + message.subject + '</h4>'+
              '<p>' + message.message + '</p>'+
              '<div class="fs-notifications-delete-message"><svg class="gr-icon gr-i-close" viewBox="0 0 24 24"><use xlink:href="/assets/icons.svg#close"></use></svg></div>'+
            '</li>'
          );

          $message.find('.fs-notifications-delete-message').click(app._onDeleteMessage);
          $list.append($message);
        }
      } else {
        app.$contentMessagesDropdown.removeClass('has-messages');
        app.$contentMessagesCount.html(0).hide();
      }

      app._loadingMessages = false;
    });

    return request;
  },

  /**
   * Delete all messages
   *
   * @param int offset
   * @param int limit
   * @return void
   */
  _fetchMessages: function(offset, limit) {
    return app.balloon.xmlHttpRequest({
      url: app.balloon.base+'/notifications',
      type: 'GET',
      dataType: 'json',
      data: {
        limit: limit,
        offset: offset
      },
    });
  },

  /**
   * Initialize infiinite scroll for messages
   *
   * @return void
   */
  _displayMessagesInfiniteScroll: function() {
    var $list = app.$contentMessagesContainer;

    $list.unbind('scroll').bind('scroll', function() {
      if(app._loadingMessages === false && ($list.scrollTop() + $list.height() * 1.75) >= $list[0].scrollHeight) {
        var offset = $list.data('fsNotificationsOffset');
        var total = $list.data('fsNotificationsTotalMessages');

        if(offset + app._messagesLimit >= (Math.ceil(total / app._messagesLimit) * app._messagesLimit) + 1) {
          $list.unbind('scroll');
        } else {
          app._displayMessages();
        }
      }
    });
  },

  /**
   * Delete all messages
   *
   * @return void
   */
  _deleteAllDisplayedMessages: function() {
    var $messages = app.$contentMessagesContainer.find('li');
    var messageIds = [];

    $messages.each(function(index, message) {
      messageIds.push($(message).data('fsMessageId'));
    });

    app._deleteMessagesIds(messageIds);
  },

  /**
   * Delete given messages
   *
   * @param array messageIds
   * @return void
   */
  _deleteMessagesIds: function(messageIds) {
    var requests = messageIds.map(function(messageId) {
      return app._deleteMessage(messageId, false);
    });

    var $d = $.when.apply($, requests);

    $d.always(function() {
      app._displayMessages();
    });

    return $d;
  },

  /**
   * Delete a given message
   *
   * @param string messageId
   * @param boolean loadNext
   * @return void
   */
  _deleteMessage: function(messageId, loadNext) {
    var $d = $.Deferred();

    app.balloon.xmlHttpRequest({
      url: app.balloon.base+'/notifications',
      type: 'DELETE',
      dataType: 'json',
      data: {
        id: messageId
      },
      success: function(body) {
        var $message = app.$contentMessagesContainer.find('li[data-fs-message-id="' + messageId + '"]');
        var $list = app.$contentMessagesContainer;
        var offset = $list.data('fsNotificationsOffset');
        var total = $list.data('fsNotificationsTotalMessages');
        total --;
        offset --;

        $list.data('fsNotificationsTotalMessages', total);
        $list.data('fsNotificationsOffset', offset);

        if(total > 0) {
          app.$contentMessagesCount.html(total).show();

          if(loadNext && offset < total) {
            //load next message
            app._displayMessages(offset, 1);
          }
        } else {
          app.$contentMessagesDropdown.removeClass('has-messages');
          app.$contentMessagesCount.html(0).hide();
        }

        $message.remove();
        $d.resolve();
      },
      error: function() {
        $d.reject();
      }
    });

    return $d;
  },

  /**
   * Click callback, deleting a given message
   *
   * @return void
   */
  _onDeleteMessage: function(event) {
    event.stopPropagation();

    var messageId = $(event.target).closest('li').data('fsMessageId');
    app._deleteMessage(messageId, true);
  },

  /** Settings **/


  /**
   * Inject notification settings to side bar
   *
   * @return void
   */
  injectSettings: function() {
    var $contentSettings = $('<dd id="fs-notification">'+
      '<div id="fs-notification-description">'+i18next.t('app.balloon_app_notification.settings.description')+'</div>'+
      '<div><input type="checkbox" id="fs-notification-subscribe" name="subscribe" value="1" /><label for="fs-notification-subscribe">'+i18next.t('app.balloon_app_notification.settings.subscribe')+'</label></div>'+
      '<div class="fs-notification-suboption"><input type="checkbox" id="fs-notification-exclude_me" checked="checked" name="exclude_me" value="1" disabled /><label for="fs-notification-exclude_me">'+i18next.t('app.balloon_app_notification.settings.exclude_me')+'</label></div>'+
      '<div class="fs-notification-suboption"><input type="checkbox" id="fs-notification-recursive" name="recursive" value="1" disabled /><label for="fs-notification-recursive">'+i18next.t('app.balloon_app_notification.settings.recursive')+'</label></div>'+
      '<input type="submit" class="fs-button-primary" value="'+i18next.t('app.balloon_app_notification.settings.save')+'">'+
    '</dd>');

    this.$contentSettings = $contentSettings;

    this.balloon.fs_content_views.push({
      id: 'notification',
      title: 'app.balloon_app_notification.settings.menu_title',
      isEnabled: function() {
        return !app.balloon.last.deleted;
      },
      onActivate: app.onActivateSettings,
      $content: $contentSettings
    });
  },

  /**
   * Callback called, when notification settings are opened
   *
   * @return void
   */
  onActivateSettings: function() {
    var $subscribe = app.$contentSettings.find('input[name=subscribe]');
    var $exclude_me = app.$contentSettings.find('input[name=exclude_me]');
    var $recursive = app.$contentSettings.find('input[name=recursive]');
    var $submit = app.$contentSettings.find('input[type=submit]');

    if(app.balloon.last.subscription === false) {
      var exclude_me = true;
    } else {
      var exclude_me = app.balloon.last.subscription_exclude_me;
    }

    if(app.balloon.last.directory === false) {
      $recursive.parent().hide();
    } else {
      $recursive.parent().show();
    }

    app._toggleCheckboxDisabled(app.balloon.last.subscription);

    $subscribe.prop('checked', app.balloon.last.subscription);
    $exclude_me.prop('checked', exclude_me);
    $recursive.prop('checked', app.balloon.last.subscription_recursive);

    $subscribe.off('change').on('change', function() {
      app._toggleCheckboxDisabled($subscribe.prop('checked'));
    });

    $submit.on('click', function(){
      var id = $(this).parent().attr('data-id');
      app.subscribe(app.balloon.last,
        $subscribe.is(':checked'),
        $exclude_me.is(':checked'),
        $recursive.is(':checked')
      );
    });
  },

  /**
   * Toggles disabled state for notification checkboxes
   *
   * @return void
   */
  _toggleCheckboxDisabled: function(subscribed) {
    var $exclude_me = app.$contentSettings.find('input[name=exclude_me]');
    var $recursive = app.$contentSettings.find('input[name=recursive]');

    if(subscribed) {
      $exclude_me.prop('disabled', false);
      $recursive.prop('disabled', false);
    } else {
      $exclude_me.prop('disabled', true);
      $recursive.prop('disabled', true);
    }
  },

  /**
   * Subscribe to notifications for current node
   *
   * @return void
   */
  subscribe: function(node, subscription, exclude_me, recursive) {
    app.balloon.xmlHttpRequest({
      url: app.balloon.base+'/nodes/subscription',
      type: 'POST',
      dataType: 'json',
      data: {
        id: app.balloon.id(node),
        subscribe: subscription,
        exclude_me: exclude_me,
        recursive: recursive
      },
      success: function(node) {
        //TODO pixtron - this does not update the node in the datasource
        app.balloon.last = node;
      }
    });
  }
};

export default app;
