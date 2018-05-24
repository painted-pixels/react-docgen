/*
 * Copyright (c) 2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @flow
 */

import isReactModuleName from './isReactModuleName';
import match from './match';
import recast from 'recast';
import resolveToModule from './resolveToModule';
import resolveToValue from './resolveToValue';

var {types: {namedTypes: types}} = recast;

function isRenderMethod(node) {
  var isProperty = node.type === 'ClassProperty';
  return (types.MethodDefinition.check(node) || isProperty) &&
    !node.computed &&
    !node.static &&
    (node.kind === '' || node.kind === 'method' || isProperty) &&
    node.key.name === 'render';
}

/**
 * Returns `true` of the path represents a class definition which either extends
 * `React.Component` or implements a `render()` method.
 */
export default function isReactComponentClass(
  path: NodePath
): bool {
  var node = path.node;
  if (!types.ClassDeclaration.check(node) &&
    !types.ClassExpression.check(node)) {
    return false;
  }

  // render method
  if (node.body.body.some(isRenderMethod)) {
    return true;
  }

  // check for @extends React.Component in docblock
  if (path.parentPath.value && path.parentPath.value) {
    var classDeclaration;
    if (Array.isArray(path.parentPath.value)) {
      var matches = path.parentPath.value.filter(function(declaration) { return declaration.type === 'ClassDeclaration' });
      if (matches[0]) {
        classDeclaration = matches[0];
      }
    } else {
      classDeclaration = path.parentPath.value;
    }
    
    if (classDeclaration.leadingComments && classDeclaration.leadingComments.length > 0) {
      var matchedComments = classDeclaration.leadingComments.filter(function(comment) { return comment.value.match(/(@extends React.Component)/) });
      if (matchedComments.length > 0) {
        return true;
      }
    }
  }

  // extends ReactComponent?
  if (!node.superClass) {
    return false;
  }
  var superClass = resolveToValue(path.get('superClass'));
  if (!match(superClass.node, {property: {name: 'Component'}})) {
    return false;
  }
  var module = resolveToModule(superClass);
  return !!module && isReactModuleName(module);
}
