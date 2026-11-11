import { useState, type ReactNode } from 'react';
import { Decorations } from './components/common';
import { emptyProgress } from './lib/progress';
import type { AppData, LevelId } from './lib/types';
import { ChildHome } from './screens/ChildHome';
import { Learn } from './screens/Learn';
import { Play } from './screens/Play';
import { ProfilePicker } from './screens/ProfilePicker';
import { Trophies } from './screens/Trophies';
import { Settings } from './screens/settings/Settings';
import { useAppData } from './state/useAppData';

export type Route =
  | { name: 'profiles' }
  | { name: 'home'; childId: string }
  | { name: 'learn'; childId: string }
  | { name: 'play'; childId: string; level: LevelId }
  | { name: 'trophies'; childId: string }
  | { name: 'settings'; childId?: string; returnTo: Route };

/**
 * Make sure a route still makes sense for the current data: a child may have been removed
 * (in Settings or another tab), or their list emptied, since the route was chosen.
 */
function resolveRoute(route: Route, data: AppData): Route {
  if (route.name === 'settings' || route.name === 'profiles') return route;
  const child = data.children.find((c) => c.id === route.childId);
  if (!child) return { name: 'profiles' };
  if ((route.name === 'play' || route.name === 'learn') && child.words.length === 0) {
    return { name: 'home', childId: child.id };
  }
  return route;
}

export function App() {
  const { data } = useAppData();
  const [requested, setRequested] = useState<Route>(() =>
    data.children.length === 1 && data.children[0]
      ? { name: 'home', childId: data.children[0].id }
      : { name: 'profiles' },
  );
  const route = resolveRoute(requested, data);

  const go = (next: Route) => {
    setRequested(next);
    window.scrollTo({ top: 0 });
  };

  const childId = 'childId' in route ? route.childId : undefined;
  const child = data.children.find((c) => c.id === childId);
  const progress = (child && data.progress[child.id]) || emptyProgress();
  const theme = route.name === 'settings' || !child ? 'neutral' : child.theme;

  let screen: ReactNode = null;
  if (route.name === 'profiles') {
    screen = (
      <ProfilePicker
        onPick={(id) => go({ name: 'home', childId: id })}
        onSettings={() => go({ name: 'settings', returnTo: route })}
      />
    );
  } else if (route.name === 'settings') {
    screen = (
      <Settings
        initialChildId={route.childId}
        onBack={() => {
          const back = route.returnTo;
          // Coming back from a game mid-round would be confusing; go to that child's home instead.
          if (back.name === 'play' || back.name === 'learn')
            go({ name: 'home', childId: back.childId });
          else if (back.name === 'profiles' && data.children.length === 1 && data.children[0])
            go({ name: 'home', childId: data.children[0].id });
          else go(back);
        }}
      />
    );
  } else if (child) {
    const home = () => go({ name: 'home', childId: child.id });
    switch (route.name) {
      case 'home':
        screen = (
          <ChildHome
            child={child}
            progress={progress}
            onBack={() => go({ name: 'profiles' })}
            onLearn={() => go({ name: 'learn', childId: child.id })}
            onPlay={(level) => go({ name: 'play', childId: child.id, level })}
            onTrophies={() => go({ name: 'trophies', childId: child.id })}
            onSettings={() => go({ name: 'settings', childId: child.id, returnTo: route })}
          />
        );
        break;
      case 'learn':
        screen = (
          <Learn
            child={child}
            onBack={home}
            onStart={() => go({ name: 'play', childId: child.id, level: 1 })}
          />
        );
        break;
      case 'play':
        screen = (
          <Play
            key={`${child.id}-${route.level}`}
            child={child}
            progress={progress}
            level={route.level}
            onExit={home}
            onLevel={(level) => go({ name: 'play', childId: child.id, level })}
          />
        );
        break;
      case 'trophies':
        screen = <Trophies child={child} progress={progress} onBack={home} />;
        break;
    }
  }

  return (
    <div className="app" data-theme={theme}>
      {theme !== 'neutral' && <Decorations theme={theme} />}
      {screen}
    </div>
  );
}
