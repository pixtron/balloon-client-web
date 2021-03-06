/**
 * balloon
 *
 * @copyright   Copryright (c) 2012-2018 gyselroth GmbH (https://gyselroth.com)
 * @license     GPL-3.0 https://opensource.org/licenses/GPL-3.0
 */

import $ from "jquery";
import kendoWindow from 'kendo-ui-core/js/kendo.window.js';
import i18next from 'i18next';
import css from '../styles/style.css';
import login from '../../../lib/auth.js';

var app = {
  render: function() {
    this.$menu = $('<li id="fs-menu-user-desktop">'
      +'<span class="gr-icon gr-i-laptop"></span>'
      +'<span>'+i18next.t('app.balloon_app_desktopclient.menu')+'</span>'
    +'</li>');

    $("#fs-identity-menu").css("height","+=20px");

    this.$menu.insertAfter('#fs-menu-user-events');
  },

  preInit: function(core)  {
    this.balloon = core;
    this.$menu.unbind('click').bind('click', function(){
      app.openPopup();
    });
  },

  openPopup: function() {
    var $div = $('<div id="fs-desktop">'
      + '<div>'+i18next.t('app.balloon_app_desktopclient.description')+'</div>'
      + '<ul>'
        + '<li id="fs-desktop-exe"><div></div><span>'+i18next.t('app.balloon_app_desktopclient.windows')+'</span></li>'
        + '<li id="fs-desktop-pkg"><div></div><span>'+i18next.t('app.balloon_app_desktopclient.osx')+'</span></li>'
        + '<li id="fs-desktop-zip"><div></div><span>'+i18next.t('app.balloon_app_desktopclient.linux')+'</span></li>'
        + '<li id="fs-desktop-deb"><div></div><span>'+i18next.t('app.balloon_app_desktopclient.debian')+'</span></li>'
        + '<li id="fs-desktop-rpm"><div></div><span>'+i18next.t('app.balloon_app_desktopclient.redhat')+'</span></li>'
      + '</ul>'
    +'</div>');

    $div.off('click').on('click', 'li', this.download);

    $('body').append($div);


    app.$k_popup = $div.kendoWindow({
      resizable: false,
      title: i18next.t('app.balloon_app_desktopclient.menu'),
      modal: true,
      draggable: true,
      open: function(e) {
      }
    }).data('kendoWindow');

    this.$k_popup.open().center();
  },

  download: function(e) {
    var format = $(this).attr('id').substr(11);
    var $iframe = $("#fs-fetch-file");
    var url = app.balloon.base+'/desktop-clients/'+format+'/content';

    if(typeof(login) === 'object' && login.getAccessToken()) {
      url += '?access_token='+login.getAccessToken();
    }

    $iframe.attr('src', url).load(url);
    app.$k_popup.close();
  }
}

export default app;
