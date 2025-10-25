// Creating engine
let engine = Matter.Engine.create();

// Creating a render and attaching it to html body
let render = Matter.Render.create({
    element: document.body,
    engine: engine,
    options: {
        // Adjusts to all screen sizes
        width: innerWidth,
        height: innerHeight,
        wireframes: false
    }
});

// Platform
let ground = Matter.Bodies.rectangle( 870, 440, 230, 20, { isStatic: true} );

// Ball and Sling
let ball = Matter.Bodies.circle( 300, 500, 20, { label: 'playerBall' } );
let sling = Matter.Constraint.create({
    pointA: { x: 300, y: 500 },
    bodyB: ball,
    stiffness: 0.05
});

// Mouse
let mouse = Matter.Mouse.create( render.canvas );
let mouseConstraint = Matter.MouseConstraint.create( engine, {
    mouse: mouse,
    constraint: {
        render: { visible: false }
    }
});
render.mouse = mouse;

// Stack
let stack = Matter.Composites.stack( 800, 270, 4, 4, 0, 0, function( x, y ) {
    return Matter.Bodies.polygon( x, y, 8, 20 );
});

// Firing
let firing = false;
Matter.Events.on( mouseConstraint, 'enddrag', function( e ) {
    if ( e.body === ball ) firing = true;
});
Matter.Events.on( engine, 'afterUpdate', function() {
    if ( firing && Math.abs( ball.position.x - 300) < 20 && Math.abs( ball.position.y - 500 ) < 20 ) {
        ball = Matter.Bodies.circle( 300, 500, 20, { label: 'playerBall' } );
        // Adding new ball after firing
        Matter.World.add( engine.world, ball );
        sling.bodyB = ball;
        firing = false;
    }
});

// -----------------------
//      Winner Modal
// -----------------------
const gb = ground.bounds;
const groundWidth = gb.max.x - gb.min.x;
// Sensor
const sensor = Matter.Bodies.rectangle(
    (gb.min.x + gb.max.x) / 2,
    gb.min.y - 6,
    groundWidth,
    12,
    {
        isStatic: true,
        isSensor: true,
        render: { visible: false }
    }
);
// Tracker
const targetsOn = new Set();
const ballsOn = new Set();
const targetIds = new Set( stack.bodies.map( b => b.id) );

function addIfRelevant( body ) {
    if ( targetIds.has( body.id ) ) targetsOn.add( body.id );
    if ( body.label === 'playerBall' ) ballsOn.add( body.id );
}
function removeIfRelevant( body ) {
    if ( targetIds.has( body.id ) ) targetsOn.delete( body.id );
    if ( body.label === 'playerBall' ) ballsOn.delete( body.id );
}

// Listen for collisions
Matter.Events.on( engine, 'collisionStart', ( evt ) => {
    for ( const pair of evt.pairs ) {
        if ( pair.bodyA === sensor ) addIfRelevant( pair.bodyB );
        else if ( pair.bodyB === sensor ) addIfRelevant( pair.bodyA );
    }
});
Matter.Events.on( engine, 'collisionEnd', ( evt ) => {
    for ( const pair of evt.pairs ) {
        if ( pair.bodyA === sensor ) removeIfRelevant( pair.bodyB );
        else if ( pair.bodyB === sensor ) removeIfRelevant( pair.bodyA );
    }
});
Matter.Events.on( engine, 'afterUpdate', function seedOnce() {
    Matter.Events.off( engine, 'afterUpdate', seedOnce );
    const initial = Matter.Query.collides( sensor, stack.bodies );
    for ( const p of initial ) {
        const other = p.bodyA === sensor ? p.bodyB : p.bodyA;
        addIfRelevant( other );
    }
});

// Winner Check
let hasWon = false;
function showWinnerModal() {
    const modal = document.getElementById( 'winnerModal' );
    if ( !modal ) return;
    engine.timing.timeScale = 0;
    modal.classList.add( 'show' );

    document.getElementById( 'playAgainBtn' )?.addEventListener( 'click', () => {
        window.location.reload();
    });
    document.getElementById( 'newLevelBtn' )?.addEventListener( 'click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById( 'quitBtn' )?.addEventListener( 'click', () => {
        window.location.href = 'index.html';
    });
}
Matter.Events.on( engine, 'afterUpdate', function () {
    if ( !hasWon ) {
        const isPlatformEmpty = targetsOn.size === 0;
        if ( isPlatformEmpty ) {
            hasWon = true;
            showWinnerModal();
        }
    }
});

// Website Display
Matter.World.add( engine.world, [ stack, ground, sensor, ball, sling, mouseConstraint ] );
Matter.Engine.run( engine );
Matter.Render.run( render );