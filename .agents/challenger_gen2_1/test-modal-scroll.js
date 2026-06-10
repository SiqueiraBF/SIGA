// We mock React's useEffect to execute synchronously for our test
let effects = [];
let cleanups = [];
const ReactMock = {
    useEffect: (fn, deps) => {
        effects.push(() => {
            const cleanup = fn();
            if (cleanup) cleanups.push(cleanup);
        });
    },
    useRef: () => ({ current: null })
};

// Global mock for document
global.document = {
    body: {
        style: { overflow: '' }
    },
    addEventListener: () => {},
    removeEventListener: () => {}
};

let openModalsCount = 0;

function mountModal(isOpen) {
    // Mimic the hook from Modal.tsx
    ReactMock.useEffect(() => {
        if (isOpen) {
            openModalsCount++;
            global.document.body.style.overflow = 'hidden';
        }
        return () => {
            if (isOpen) {
                openModalsCount--;
                if (openModalsCount === 0) {
                    global.document.body.style.overflow = '';
                }
            }
        };
    }, [isOpen]);
    
    // run effects
    effects.forEach(fn => fn());
    effects = []; // clear
    return () => {
        // run unmount
        cleanups.forEach(fn => fn());
        cleanups = [];
    };
}

console.log("Initial body overflow:", global.document.body.style.overflow);

const unmountModal1 = mountModal(true);
console.log("After Modal 1 opens, overflow:", global.document.body.style.overflow);
console.log("openModalsCount:", openModalsCount);

const unmountModal2 = mountModal(true);
console.log("After Modal 2 opens, overflow:", global.document.body.style.overflow);
console.log("openModalsCount:", openModalsCount);

// Unmount Modal 2
unmountModal2();
console.log("After Modal 2 closes, overflow:", global.document.body.style.overflow);
console.log("openModalsCount:", openModalsCount);

// Unmount Modal 1
unmountModal1();
console.log("After Modal 1 closes, overflow:", global.document.body.style.overflow);
console.log("openModalsCount:", openModalsCount);
