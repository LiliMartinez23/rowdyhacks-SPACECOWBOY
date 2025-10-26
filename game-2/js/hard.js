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
        wireframes: false,
        background: 'transparent'
    }
});

// UFO's
const slope = 0.35;
const ufoImgPxW = 300;
const ufoImgPxH = 25;

function createUFO( x, y, bodyW, bodyH = 25 ) {
    const ufoScaleX = bodyW / ufoImgPxW;
    const ufoScaleY = bodyH / ufoImgPxH;
    return Matter.Bodies.trapezoid( x, y, bodyW, bodyH, slope, {
        isStatic: true,
        chamfer: { radius: 6 },
        label: 'ufoPlatform',
        render: {
            sprite: {
                texture: 'img/ufo.png',
                xScale: ufoScaleX,
                yScale: ufoScaleY
            }
        }
    });
}
let ufo1 = createUFO( 890, 440, 230 );
let ufo2 = createUFO( 590, 500, 230 );
let ufo3 = createUFO( 735, 160, 130 );

// Star and sling
const origin = { x: 300, y: 500 };
const starRadius = 15;
const starImgPx = 200;
const starScale = ( starRadius * 2 ) / starImgPx;

function createStar( x = origin.x, y = origin.y ) {
    return Matter.Bodies.circle( x, y, starRadius, {
        label: 'playerStar',
        render: {
            sprite: {
                texture: 'img/star.png',
                xScale: starScale,
                yScale: starScale
            }
        }
    });
}
let star = createStar();
let sling = Matter.Constraint.create({
    pointA: { x: origin.x, y: origin.y },
    bodyB: star,
    stiffness: 0.015,
    render: {
        strokeStyle: '#c09452',
        lineWidth: 2
    }
});
const maxTries = 10;
let triesLeft = maxTries;

// Mouse
let mouse = Matter.Mouse.create( render.canvas );
let mouseConstraint = Matter.MouseConstraint.create( engine, {
    mouse: mouse,
    constraint: {
        render: { visible: false }
    }
});
render.mouse = mouse;

// Aliens
const alienRadius = 20;
const alienImgPx = 300;
const alienScale = ( alienRadius * 2 ) / alienImgPx;
const freezeAlienRotation = false;

function createAlien( x, y ) {
    const body = Matter.Bodies.polygon( x, y, 8, alienRadius, {
        label: 'targetAlien',
        render: {
            sprite: {
                texture: 'img/alien.png',
                xScale: alienScale,
                yScale: alienScale
            }
        }
    });

    if ( freezeAlienRotation ) {
        body.inertia = Infinity;
        body.inverseInertia = 0;
    }
    return body;
}

let alienStack1 = Matter.Composites.stack( 815, 270, 4, 4, 0, 0, ( x, y ) => createAlien( x, y ) );
alienStack1.label = 'Aliens Stack 1';
let alienStack2 = Matter.Composites.stack( 515, 270, 4, 4, 0, 0, ( x, y ) => createAlien( x, y ) );
alienStack2.label = 'Aliens Stack 2';
let alienStack3 = Matter.Composites.stack( 700, 60, 2, 2, 0, 0, ( x, y ) => createAlien( x, y ) );
alienStack3.label = 'Aliens Stack 3';

// Firing
let firing = false;
Matter.Events.on( mouseConstraint, 'enddrag', function( e ) {
    if ( star && e.body === star && triesLeft > 0 ) {
        firing = true;
        triesLeft--;
    }
});
Matter.Events.on( engine, 'afterUpdate', function() {
    if ( !star ) return;

    const nearOrigin =
    Math.abs( star.position.x - origin.x ) < 20 &&
    Math.abs( star.position.y - origin.y ) < 20;

    if ( firing && nearOrigin ) {
        firing = false;

        if ( triesLeft > 0 ) {
            star = createStar();
            Matter.World.add( engine.world, star );
            sling.bodyB = star;
        } else {
            sling.bodyB = null;
            // Matter.World.remove( engine.world, star );
            star.isStatic = true;
            star.collisionFilter.mask = 0;
            star = null;
        }
    }
});

// -----------------------
//      Winner Modal
// -----------------------
function makeUfoSensor( platformBody, name ) {
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
const sensor1 = makeUfoSensor( ufo1, 'Sensor 1');
const sensor2 = makeUfoSensor( ufo2, 'Sensor 2' );
const sensor3 = makeUfoSensor( ufo3, 'Sensor 3' );
const sensors = new Set([ sensor1, sensor2, sensor3 ]);

// Tracker
const aliensOn = new Set();
const starsOn = new Set();
const alienIds = new Set([
    ...alienStack1.bodies.map( b => b.id ),
    ...alienStack2.bodies.map( b => b.id ),
    ...alienStack3.bodies.map( b => b.id ),
]);

function addIfRelevant( body ) {
    if ( alienIds.has( body.id ) ) aliensOn.add( body.id );
    if ( body.label === 'playerStar' ) starsOn.add( body.id );
}
function removeIfRelevant( body ) {
    if ( alienIds.has( body.id ) ) aliensOn.delete( body.id );
    if ( body.label === 'playerStar' ) starsOn.delete( body.id );
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
    const stacks = [ alienStack1, alienStack2, alienStack3 ];
    const platformSensors = [ sensor1, sensor2, sensor3 ];
    for ( const s of stacks ) {
        for ( const sens of platformSensors ) {
            const initial = Matter.Query.collides( sens, s.bodies );
            for ( const p of initial ) {
                const other = p.bodyA === sens ? p.bodyB : p.bodyA;
                addIfRelevant( other );
            }
        }
    }
});

// Winner Check
let hasWon = false;
let hasLost = false;

function showWinnerModal() {
    const modal = document.getElementById( 'winnerModal' );
    if ( !modal ) return;
    engine.timing.timeScale = 0;
    modal.classList.add( 'show' );

    document.getElementById( 'playAgainBtn' )?.addEventListener( 'click', () => {
        window.location.reload();
    });
    document.getElementById( 'newLevelBtn' )?.addEventListener( 'click', () => {
        window.location.href = 'cowboys-vs-aliens.html';
    });
    document.getElementById( 'quitBtn' )?.addEventListener( 'click', () => {
        window.location.href = 'cowboys-vs-aliens.html';
    });
}
function showLostModal() {
    const modal = document.getElementById( 'lostModal' );
    if ( !modal ) return;
    engine.timing.timeScale = 0;
    modal.classList.add( 'show' );

    modal.querySelector( '#playAgainBtnLost' )?.addEventListener( 'click', () => {
        window.location.reload();
    });
    modal.querySelector( '#newLevelBtnLost' )?.addEventListener( 'click', () => {
        window.location.href = 'cowboys-vs-aliens.html';
    });
    modal.querySelector( '#quitBtnLost' )?.addEventListener( 'click', () => {
        window.location.href = 'cowboys-vs-aliens.html';
    });
}

Matter.Events.on( engine, 'afterUpdate', function () {
    if ( !hasWon ) {
        const allPlatformsEmpty = aliensOn.size === 0;
        if ( allPlatformsEmpty ) {
            hasWon = true;
            showWinnerModal();
        }
    }
});
Matter.Events.on( engine, 'afterUpdate', function() {
    if ( !hasLost && !hasWon && triesLeft === 0 && !star ) {
        hasLost = true;
        showLostModal();
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
    const x = ufo3.position.x;
    let nextX = x + horizontalMotion.speed * horizontalMotion.dir;

    if ( nextX < horizontalMotion.minX ) { nextX = horizontalMotion.minX; horizontalMotion.dir = 1; }
    if ( nextX > horizontalMotion.maxX ) { nextX = horizontalMotion.maxX; horizontalMotion.dir = -1; }

    const dx = nextX - x;
    if ( dx === 0 ) return;

    Matter.Body.translate( ufo3, { x: dx, y: 0} );
    Matter.Body.translate( sensor3, { x: dx, y: 0 } );
    Matter.Composite.translate( alienStack3, { x:dx, y: 0 } );
});


// --------------------------
//      Website Display
// --------------------------
Matter.World.add( engine.world, [
    // Stacks
    alienStack1, alienStack2, alienStack3,
    // Platforms
    ufo1, ufo2, ufo3,
    // Sensors
    sensor1, sensor2, sensor3,
    // Player & controls
    star, sling, mouseConstraint 
]);
Matter.Engine.run( engine );
Matter.Render.run( render );