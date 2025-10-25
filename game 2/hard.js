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

// Platform 1
let ground = Matter.Bodies.rectangle( 890, 440, 230, 20, { isStatic: true} );
// Platform 2
let ground2 = Matter.Bodies.rectangle( 590, 500, 230, 20, { isStatic: true} );
// Platform 3
let ground3 = Matter.Bodies.rectangle( 735, 160, 130, 20, { isStatic: true} );

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

// Stack 1
let stack = Matter.Composites.stack( 815, 270, 4, 4, 0, 0, function( x, y ) {
    return Matter.Bodies.polygon( x, y, 8, 20 );
});
stack.label = 'Stack 1';
// Stack 2
let stack2 = Matter.Composites.stack( 515, 270, 4, 4, 0, 0, function( x, y ) {
    return Matter.Bodies.polygon( x, y, 8, 20 );
});
stack2.label = 'Stack 2';
// Stack 3
let stack3 = Matter.Composites.stack( 700, 60, 2, 2, 0, 0, function( x, y ) {
    return Matter.Bodies.polygon( x, y, 8, 18 );
});
stack3.label = 'Stack 3';

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
function makePlatformSensor( platformBody, name ) {
    const b = platformBody.bounds;
    const width = b.max.x - b.min.x;
    return Matter.Bodies.rectangle(
        (b.min.x + b.max.x) / 2,
        b.min.y - 6,
        width,
        12,
        { isStatic: true, isSensor: true, render: { visible: false }, label: name }
    );
}
const sensor1 = makePlatformSensor( ground, 'Sensor 1');
const sensor2 = makePlatformSensor( ground2, 'Sensor 2' );
const sensor3 = makePlatformSensor( ground3, 'Sensor 3' );
const sensors = new Set([ sensor1, sensor2, sensor3 ]);

// Tracker
const targetsOn = new Set();
const ballsOn = new Set();

const allTargetIds = new Set([
    ...stack.bodies.map( b => b.id ),
    ...stack2.bodies.map( b => b.id ),
    ...stack3.bodies.map( b => b.id ),
]);

function addIfRelevant( body ) {
    if ( allTargetIds.has( body.id ) ) targetsOn.add( body.id );
    if ( body.label === 'playerBall' ) ballsOn.add( body.id );
}
function removeIfRelevant( body ) {
    if ( allTargetIds.has( body.id ) ) targetsOn.delete( body.id );
    if ( body.label === 'playerBall' ) ballsOn.delete( body.id );
}

// Listen for collisions
Matter.Events.on( engine, 'collisionStart', ( evt ) => {
    for ( const pair of evt.pairs ) {
        const { bodyA, bodyB } = pair;
        if ( sensors.has( bodyA ) ) addIfRelevant( bodyB );
        else if ( sensors.has( bodyB )) addIfRelevant( bodyA );
    }
});
Matter.Events.on( engine, 'collisionEnd', ( evt ) => {
    for ( const pair of evt.pairs ) {
        const { bodyA, bodyB } = pair;
        if ( sensors.has( bodyA ) ) removeIfRelevant( bodyB );
        else if ( sensors.has( bodyB ) ) removeIfRelevant( bodyA );
    }
});
Matter.Events.on( engine, 'afterUpdate', function seedOnce() {
    Matter.Events.off( engine, 'afterUpdate', seedOnce );
    const stacks = [ stack, stack2, stack3 ];
    const platformSensors = [ sensor1, sensor2, sensor3 ];
    for ( const s of stacks ) {
        for ( const sens of platformSensors ) {
            const inital = Matter.Query.collides( sens, s.bodies );
            for ( const p of initial ) {
                const other = p.bodyA === sens ? p.bodyB : p.bodyA;
                addIfRelevant( other );
            }
        }
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
        const allPlatformsEmpty = targetsOn.size === 0;
        if ( allPlatformsEmpty ) {
            hasWon = true;
            showWinnerModal();
        }
    }
});

// ---------------------------
//      Horizontal Motion
// ---------------------------
const horizontalMotion = {
    minX: 600,
    maxX: 870,
    speed: 2.2,
    dir: 1
};

Matter.Events.on( engine, 'beforeUpdate', function() {
    const x = ground3.position.x;
    let nextX = x + horizontalMotion.speed * horizontalMotion.dir;

    if ( nextX < horizontalMotion.minX ) { nextX = horizontalMotion.minX; horizontalMotion.dir = 1; }
    if ( nextX > horizontalMotion.maxX ) { nextX = horizontalMotion.maxX; horizontalMotion.dir = -1; }

    const dx = nextX - x;
    if ( dx === 0 ) return;

    Matter.Body.translate( ground3, { x: dx, y: 0} );
    Matter.Body.translate( sensor3, { x: dx, y: 0 } );
    Matter.Composite.translate( stack3, { x:dx, y: 0 } );
});


// --------------------------
//      Website Display
// --------------------------
Matter.World.add( engine.world, [
    // Stacks
    stack, stack2, stack3,
    // Platforms
    ground, ground2, ground3,
    // Sensors
    sensor1, sensor2, sensor3,
    // Player & controls
    ball, sling, mouseConstraint 
]);
Matter.Engine.run( engine );
Matter.Render.run( render );