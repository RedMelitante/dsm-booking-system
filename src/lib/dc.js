import React from 'react';

// The design canvas boards were written against a small `DCLogic` base class with
// the same lifecycle as a React class component (props, state, setState,
// componentDidMount/DidUpdate/WillUnmount). Each page keeps its board's logic
// class and extends this base, so the behaviour matches the prototype.
export class DCLogic extends React.Component {}
