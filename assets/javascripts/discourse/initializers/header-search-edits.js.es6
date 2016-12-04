import { withPluginApi } from 'discourse/lib/plugin-api';
import SiteHeader from 'discourse/components/site-header';
import { wantsNewWindow } from 'discourse/lib/intercept-click';
import DiscourseURL from 'discourse/lib/url';
import { default as computed, on, observes } from 'ember-addons/ember-computed-decorators';

const searchData = {
  loading: false,
  results: {},
  noResults: false,
  term: undefined,
  typeFilter: null,
  invalidTerm: false
};

export default {
  name: 'header-search',
  initialize(container){

    SiteHeader.reopen({
      toggleVisibility(topicToggled) {
        let headerWidth = this.$('.d-header .contents').width(),
            panelWidth = this.$('.d-header .panel').width(),
            titleWidth = this.$('.d-header .title a').width() + 560, // 560 is the width of the search input
            showHeaderSearch = headerWidth > (panelWidth + titleWidth + 50);

        const appController = this.container.lookup('controller:application'),
              currentState = appController.get('showHeaderSearch');

        appController.set('showHeaderSearch', showHeaderSearch)
        if (topicToggled || ((showHeaderSearch != currentState) || currentState === undefined)) {
          this.queueRerender()
          Ember.run.scheduleOnce('afterRender', () => {
            $('.d-header').toggleClass('header-search-enabled',
              !$('.search-menu').length && showHeaderSearch && !this._topic
            )
          })
        }
      },

      @on('didInsertElement')
      initSizeWatcher() {
        Ember.run.scheduleOnce('afterRender', () => {
          this.toggleVisibility()
        })
        $(window).on('resize', Ember.run.bind(this, this.toggleVisibility))
        this.appEvents.on('header:show-topic', () => this.toggleVisibility(true))
        this.appEvents.on('header:hide-topic', () => this.toggleVisibility(true))
      },

      @on('willDestroyElement')
      destroySizeWatcher() {
        $(window).off('resize', Ember.run.bind(this, this.toggleVisibility))
      }
    })

    withPluginApi('0.1', api => {

      api.attachWidgetAction('search-menu', 'html', function() {
        this.tagName = `div.search-${this.state.formFactor}`
        if (this.state.formFactor === 'header') {
          return this.panelContents();
        } else {
          return this.attach('menu-panel', { maxWidth: 500, contents: () => this.panelContents() });
        }
      })

      api.attachWidgetAction('search-menu', 'buildKey', function(attrs) {
        let type = attrs.formFactor || 'menu'
        return `search-${type}`
      })

      api.attachWidgetAction('search-menu', 'defaultState', function(attrs) {
        return {
          formFactor: attrs.formFactor || 'menu',
          showHeaderResults: false
        }
      })

      api.attachWidgetAction('search-menu', 'clickOutside', function() {
        const formFactor = this.state.formFactor
        if (formFactor === 'menu') {
          return this.sendWidgetAction('toggleSearchMenu');
        } else {
          this.state.showHeaderResults = false
          this.scheduleRerender()
        }
      })

      api.attachWidgetAction('search-menu', 'click', function() {
        const formFactor = this.state.formFactor
        if (formFactor === 'header') {
          this.state.showHeaderResults = true
          this.scheduleRerender()
        }
      })

      api.attachWidgetAction('search-menu', 'linkClickedEvent', function() {
        const formFactor = this.state.formFactor
        if (formFactor === 'header') {
          this.state.showHeaderResults = false
          this.scheduleRerender()
        }
      })

      const searchMenuWidget = container.lookupFactory('widget:search-menu');
      const panelContents = searchMenuWidget.prototype['panelContents'];
      api.attachWidgetAction('search-menu', 'panelContents', function() {
        let formFactor = this.state.formFactor
        let showHeaderResults = this.state.showHeaderResults == null || this.state.showHeaderResults === true

        if (formFactor ==='menu' || showHeaderResults) {
          return panelContents.call(this)
        } else {
          let contents = panelContents.call(this)
          return contents.filter((widget) => {
            return widget.name != 'search-menu-results'
          })
        }
      })

      api.decorateWidget('home-logo:after', function(helper) {
        const header = helper.widget.parentWidget,
              appController = helper.container.lookup('controller:application'),
              showHeaderSearch = appController.get('showHeaderSearch'),
              searchMenuVisible = header.state.searchVisible;

        if (!searchMenuVisible && showHeaderSearch && !header.attrs.topic && !helper.widget.site.mobileView) {
          $('.d-header').addClass('header-search-enabled')
        //  return helper.attach('search-menu', { contextEnabled: header.state.contextEnabled, formFactor: 'header' })
  	       if (!helper.widget.site.mobileView) {
            const origin_code = helper.attach('header-search', { contextEnabled: header.state.contextEnabled, formFactor: 'header' });
            const nav_contents = h('div.topic-extra-info.header-links-wrapper.clearfix', [
              h('a.header-link', { attributes: { href: Discourse.getURL(`/categories`), title: '论坛最新' } }, '首页'),
              h('a.header-link', { attributes: { href: Discourse.getURL(`/c/vrdiscuss`), title: 'VR虚拟现实话题讨论' } }, '讨论区'),
              h('a.header-link', { attributes: { href: Discourse.getURL(`/c/vrdevices`), title: '各种VR设备信息及评测' } }, '设备区'),
              h('a.header-link', { attributes: { href: Discourse.getURL(`/c/resource`), title: '视频资源及游戏工具下载' } }, '资源区'),
              h('a.header-link.u-button', { attributes: { href: 'http://dmgeek.com/', title: '返回到盗梦极客主页', target: '_blank', onClick: 'window.open().location.href="http://dmgeek.com/"' } }, '盗梦主页')
            ]);
          }
          // return helper.attach('header-search', { contextEnabled: header.state.contextEnabled })
          return [origin_code, nav_contents];
        } else {
          $('.d-header').removeClass('header-search-enabled')
        }
      })

      api.attachWidgetAction('home-logo', 'click', function(e) {
        if (wantsNewWindow(e)) { return false; }
        e.preventDefault();
        if (e.target.id === 'site-logo' || e.target.id === 'site-text-logo') {
          DiscourseURL.routeTo(this.href());
        }
        return false;
      })
    })
  }
}
