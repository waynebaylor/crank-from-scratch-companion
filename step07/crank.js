function wrap(value) {
  return value === undefined ? [] : Array.isArray(value) ? value : [value];
}

function unwrap(arr) {
  return arr.length <= 1 ? arr[0] : arr;
}

function arrayify(value) {
  return value == null ? [] : typeof value !== 'string' && typeof value[Symbol.iterator] === 'function' ? Array.from(value) : [value];
}

function isIteratorLike(value) {
  return value != null && typeof value.next === 'function';
}

class Element {
  constructor(tag, props) {
    this.tag = tag;
    this.props = props;

    this._node = undefined;
    this._children = undefined;
    this._ctx = undefined;

    // flags
    this._isMounted = false;
  }
}

export const Portal = Symbol.for('crank.Portal');

export const Fragment = '';

export function createElement(tag, props, ...children) {
  props = Object.assign({}, props);
  if (children.length === 1) {
    props.children = children[0];
  } else if (children.length > 1) {
    props.children = children;
  }

  return new Element(tag, props);
}

function narrow(value) {
  if (typeof value === 'boolean' || value == null) {
    return undefined;
  } else if (typeof value === 'string' || value instanceof Element) {
    return value;
  } else if (typeof value[Symbol.iterator] === 'function') {
    return createElement(Fragment, null, value);
  }

  return value.toString();
}

function normalize(values) {
  const values1 = [];
  let buffer;
  for (const value of values) {
    if (!value) {
      // pass
    } else if (typeof value === 'string') {
      buffer = (buffer || '') + value;
    } else if (!Array.isArray(value)) {
      if (buffer) {
        values1.push(buffer);
        buffer = undefined;
      }

      values1.push(value);
    } else {
      for (const value1 of value) {
        if (!value1) {
          // pass
        } else if (typeof value1 === 'string') {
          buffer = (buffer || '') + value1;
        } else {
          if (buffer) {
            values1.push(buffer);
            buffer = undefined;
          }

          values1.push(value1);
        }
      }
    }
  }

  if (buffer) {
    values1.push(buffer);
  }

  return values1;
}

function getValue(el) {
  if (el.tag === Portal) {
    return undefined;
  } else if (typeof el.tag !== 'function' && el.tag !== Fragment) {
    return el._node;
  }

  return unwrap(getChildValues(el));
}

function getChildValues(el) {
  const values = [];
  for (const child of wrap(el._children)) {
    if (typeof child === 'string') {
      values.push(child);
    } else if (typeof child !== 'undefined') {
      values.push(getValue(child));
    }
  }

  return normalize(values);
}

export class Renderer {
  constructor() {
    this._cache = new WeakMap();
  }

  render(children, root) {
    let portal = this._cache.get(root);
    if (portal) {
      portal.props = { root, children };
    } else {
      portal = createElement(Portal, { root, children });
      this._cache.set(root, portal);
    }

    return update(this, portal, portal);
  }

  create(el) {
    return document.createElement(el.tag);
  }

  patch(el, node) {
    for (let [name, value] of Object.entries(el.props)) {
      if (name === 'children') {
        continue;
      } else if (name === 'class') {
        name = 'className';
      }

      if (name in node) {
        node[name] = value;
      } else {
        node.setAttribute(name, value);
      }
    }
  }

  arrange(el, node, children) {
    let child = node.firstChild;
    for (const newChild of children) {
      if (child === newChild) {
        child = child.nextSibling;
      } else if (typeof newChild === 'string') {
        if (child !== null && child.nodeType === Node.TEXT_NODE) {
          child.nodeValue = newChild;
          child = child.nextSibling;
        } else {
          node.insertBefore(document.createTextNode(newChild), child);
        }
      } else {
        node.insertBefore(newChild, child);
      }
    }

    while (child !== null) {
      const nextSibling = child.nextSibling;
      node.removeChild(child);
      child = child.nextSibling;
    }
  }
}

function diff(renderer, host, oldChild, newChild) {
  if (oldChild instanceof Element && newChild instanceof Element && oldChild.tag === newChild.tag) {
    if (oldChild !== newChild) {
      oldChild.props = newChild.props;
      newChild = oldChild;
    }
  }

  let value;
  if (newChild instanceof Element) {
    value = update(renderer, host, newChild);
  } else {
    value = newChild;
  }

  return [newChild, value];
}

function update(renderer, host, el) {
  if (el._isMounted) {
    el = createElement(el, { ...el.props });
  }

  if (typeof el.tag === 'function') {
    if (!el._ctx) {
      el._ctx = new Context(renderer, host, el);
    }

    return updateCtx(el._ctx);
  } else if (el.tag !== Fragment) {
    host = el;
  }

  return updateChildren(renderer, host, el, el.props.children);
}

function updateChildren(renderer, host, el, newChildren) {
  const oldChildren = wrap(el._children);
  newChildren = arrayify(newChildren);
  const children = [];
  const values = [];
  const length = Math.max(oldChildren.length, newChildren.length);
  for (let i = 0; i < length; i++) {
    const oldChild = oldChildren[i];
    let newChild = narrow(newChildren[i]);
    const [child, value] = diff(renderer, host, oldChild, newChild);
    children.push(child);
    if (value) {
      values.push(value);
    }
  }

  el._children = unwrap(children);
  return commit(renderer, el, normalize(values));
}

function commit(renderer, el, values) {
  if (typeof el.tag === 'function') {
    return commitCtx(el._ctx, values);
  } else if (el.tag === Fragment) {
    return unwrap(values);
  } else if (el.tag === Portal) {
    renderer.arrange(el, el.props.root, values);
    return undefined;
  } else if (!el._node) {
    el._node = renderer.create(el);
  }

  renderer.patch(el, el._node);
  renderer.arrange(el, el._node, values);
  return el._node;
}

class Context {
  constructor(renderer, host, el) {
    this._renderer = renderer;
    this._host = host;
    this._el = el;
    this._iter = undefined;

    // flags
    this._isUpdating = false;
  }

  refresh() {
    return stepCtx(this);
  }
}

function stepCtx(ctx) {
  if (!ctx._iter) {
    const value = ctx._el.tag.call(ctx, ctx._el.props);
    if (isIteratorLike(value)) {
      ctx._iter = value;
    } else {
      return updateCtxChildren(ctx, value);
    }
  }

  const iteration = ctx._iter.next();
  return updateCtxChildren(ctx, iteration.value);
}

function updateCtx(ctx) {
  ctx._isUpdating = true;
  return stepCtx(ctx);
}

function updateCtxChildren(ctx, children) {
  return updateChildren(ctx._renderer, ctx._host, ctx._el, narrow(children));
}

function commitCtx(ctx, values) {
  if (!ctx._isUpdating) {
    ctx._renderer.arrange(ctx._host, ctx._host.tag === Portal ? ctx._host.props.root : ctx._host._node, getChildValues(ctx._host));
  }

  ctx._isUpdating = false;
  return unwrap(values);
}
