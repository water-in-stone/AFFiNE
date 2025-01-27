import { Entity, LiveData } from '@toeverything/infra';
import type { Location, To } from 'history';
import { Observable } from 'rxjs';

import { createNavigableHistory } from '../../../utils/navigable-history';
import { ViewScope } from '../scopes/view';
import { SidebarTab } from './sidebar-tab';

export class View extends Entity<{
  id: string;
  defaultLocation?: To | undefined;
}> {
  scope = this.framework.createScope(ViewScope, {
    view: this as View,
  });

  get id() {
    return this.props.id;
  }

  set id(id: string) {
    this.props.id = id;
  }

  sidebarTabs$ = new LiveData<SidebarTab[]>([]);

  // _activeTabId may point to a non-existent tab.
  // In this case, we still retain the activeTabId data and wait for the non-existent tab to be mounted.
  _activeSidebarTabId$ = new LiveData<string | null>(null);
  activeSidebarTab$ = LiveData.computed(get => {
    const activeTabId = get(this._activeSidebarTabId$);
    const tabs = get(this.sidebarTabs$);
    return tabs.length > 0
      ? (tabs.find(tab => tab.id === activeTabId) ?? tabs[0])
      : null;
  });

  constructor() {
    super();
    this.history = createNavigableHistory({
      initialEntries: [this.props.defaultLocation ?? { pathname: '/all' }],
      initialIndex: 0,
    });
  }

  history = createNavigableHistory({
    initialEntries: ['/all'],
    initialIndex: 0,
  });

  location$ = LiveData.from<Location>(
    new Observable(subscriber => {
      subscriber.next(this.history.location);
      return this.history.listen(update => {
        subscriber.next(update.location);
      });
    }),
    this.history.location
  );

  entries$ = LiveData.from<Location[]>(
    new Observable(subscriber => {
      subscriber.next(this.history.entries);
      return this.history.listen(() => {
        subscriber.next(this.history.entries);
      });
    }),
    this.history.entries
  );

  size$ = new LiveData(100);

  push(path: To) {
    this.history.push(path);
  }

  go(n: number) {
    this.history.go(n);
  }

  replace(path: To) {
    this.history.replace(path);
  }

  setSize(size?: number) {
    this.size$.next(size ?? 100);
  }

  addSidebarTab(id: string) {
    this.sidebarTabs$.next([
      ...this.sidebarTabs$.value,
      this.scope.createEntity(SidebarTab, {
        id,
      }),
    ]);
    return id;
  }

  removeSidebarTab(id: string) {
    this.sidebarTabs$.next(
      this.sidebarTabs$.value.filter(tab => tab.id !== id)
    );
  }

  activeSidebarTab(id: string | null) {
    this._activeSidebarTabId$.next(id);
  }
}
