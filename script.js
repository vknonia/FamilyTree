/* ==========================================================
   1. GLOBAL VARIABLES & INITIAL STATE
   ================================================---------- */
let scale = 0.5;
let pointX = 0;
let pointY = 0;
let start = { x: 0, y: 0 };
let isDragging = false;
let hasDragged = false; // स्वाइप और क्लिक में अंतर करने के लिए
let touchStartDist = 0;

const containerEl = document.getElementById("scrollContainer");


/* ==========================================================
   2. DOM & TREE BUILDING FUNCTIONS
   ================================================---------- */

function makeBox(person) {
    const boxClass = person.gender === "Male" ? "male-box" : "female-box";
    let imgTag = "";
    if (person.image && person.image.trim() !== "") {
        imgTag = `<img class="image-box" src="${person.image}" alt="${person.name}" onerror="this.style.display='none'">`;
    }
    const webSafeId = "node-" + person.name.replace(/\s+/g, "-");
    return `
     <div class="ratio-box ${boxClass}" id="${webSafeId}" data-name="${person.name}" onclick="handleNodeClick('${person.name}', event)">
         <div class="details-corner-btn" onclick="showPersonDetails('${person.name}', event)">
             <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" fill="currentColor"/></svg>
         </div>
         <div class="image-container">
             <div class="avatar-fallback-head"></div>
             <div class="avatar-fallback-body"></div>
             ${imgTag}
         </div>
         <div class="profile-name">${person.name}</div>
     </div>
 `;
}

function buildRenderTree(node) {
    const hasKids = node.children && node.children.length > 0;
    let html = `<div class="node-branch-item">`;
    html += `<div class="couple-box-wrapper">`;
    html += `<div class="couple-row">`;
    html += makeBox(node);
    if (node.wife) {
        html += makeBox(node.wife);
    } else if (node.husband) {
        html += makeBox(node.husband);
    }
    html += `</div>`;
    if (hasKids) {
        html += `<div class="stem-down" style="display: none;"></div>`;
        html += `<button class="toggle-btn" onclick="toggleChildren(this, event)">+</button>`;
    }
    html += `</div>`;
    if (hasKids) {
        html += `<div class="nodes-container collapsed-children">`;
        node.children.forEach((child) => {
            html += buildRenderTree(child);
        });
        html += `</div>`;
    }
    html += `</div>`;
    return html;
}

function updateTransform() {
    const wrapperEl = document.getElementById("zoomWrapper");
    wrapperEl.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
}

function clearAllSizes() {
    document.querySelectorAll(".couple-row").forEach((row) => {
        row.classList.remove("current-head");
        row.classList.remove("child-size-large"); 
    });
}


/* ==========================================================
   3. INTERACTION & CLICK LOGIC (Highlight, Head & Center)
   ================================================---------- */

function toggleChildren(btn, event) {
    if (event) event.stopPropagation();
    const coupleWrapper = btn.parentElement;
    const itemBranch = coupleWrapper.parentElement;
    const containerKids = itemBranch.querySelector(".nodes-container");
    const stemLine = coupleWrapper.querySelector(".stem-down");
    
    if (containerKids) {
        if (containerKids.classList.contains("collapsed-children")) {
            containerKids.classList.remove("collapsed-children");
            if (stemLine) stemLine.style.display = "block";
            btn.innerText = "-";
        } else {
            containerKids.classList.add("collapsed-children");
            if (stemLine) stemLine.style.display = "none";
            btn.innerText = "+";
        }
    }
    updateTransform();
}

function handleNodeClick(targetName, event) {
    if (event) event.stopPropagation();
    if (hasDragged) return;

    // पुराना हाइलाइट और बटन हटाएँ
    document.querySelectorAll(".ratio-box").forEach((box) => box.classList.remove("highlight-active"));
    document.querySelectorAll(".details-corner-btn").forEach((btn) => (btn.style.display = "none"));
    document.querySelectorAll(".head-btn").forEach((btn) => (btn.style.display = "none"));
    
    const clickedBox = document.querySelector(`.ratio-box[data-name="${targetName}"]`);
    if (clickedBox) {
        const coupleRow = clickedBox.parentElement;
        const branchItem = coupleRow.closest(".node-branch-item");
        
        // --- HIGHLIGHT LOGIC ---
        coupleRow.querySelectorAll(".ratio-box").forEach((box) => box.classList.add("highlight-active"));
        clickedBox.querySelector(".details-corner-btn").style.display = "flex";
        if (branchItem) {
            branchItem.querySelectorAll(".nodes-container .ratio-box").forEach((childBox) => {
                childBox.classList.add("highlight-active");
            });
        }
        
        const isAlreadyHead = coupleRow.classList.contains("current-head");
        document.querySelectorAll(".head-btn").forEach((btn) => btn.remove());
        
        const menuHtml = `
        <div class="head-btn ${isAlreadyHead ? "hide-head-btn" : ""}"
             onclick="makeHeadAndScale('${targetName}', event)">
            <svg viewBox="0 0 24 24">
                <path d="M6 16l-3-9 5.5 4 4-7 4 7 5.5-4-3 9H5zM3 18h18v2H3v-2z"/>
            </svg>
        </div>
        `;
        coupleRow.parentElement.insertAdjacentHTML("beforeend", menuHtml);
    }
}

function makeHeadAndScale(targetName, event) {
    if (event) event.stopPropagation();

    // सब रीसेट करें
    document.querySelectorAll(".nodes-container").forEach((container) => {
        container.classList.add("collapsed-children");
        const stem = container.parentElement.querySelector(".couple-box-wrapper .stem-down");
        const btn = container.parentElement.querySelector(".couple-box-wrapper .toggle-btn");
        if (stem) stem.style.display = "none";
        if (btn) btn.innerText = "+";
    });
    clearAllSizes();

    const clickedBox = document.querySelector(`.ratio-box[data-name="${targetName}"]`);
    if (!clickedBox) return;

    const coupleRow = clickedBox.parentElement;
    const branchItem = coupleRow.closest(".node-branch-item");

    const headBtn = coupleRow.parentElement.querySelector('.head-btn');
    if (headBtn) {
        headBtn.style.display = 'none';
    }

    // ऊपर के पेरेंट्स तुरंत खुलें
    let checkParent = branchItem.parentElement;
    while (checkParent && checkParent.id !== "treeMain") {
        if (checkParent.classList.contains("nodes-container")) {
            checkParent.classList.remove("collapsed-children");
            const parentStem = checkParent.parentElement.querySelector(".couple-box-wrapper .stem-down");
            const parentBtn = checkParent.parentElement.querySelector(".couple-box-wrapper .toggle-btn");
            if (parentStem) parentStem.style.display = "block";
            if (parentBtn) parentBtn.innerText = "-";
        }
        checkParent = checkParent.parentElement;
    }

    // हेड पर क्लास और हाइलाइट दोनों लगाएं
    coupleRow.classList.add("current-head");
    coupleRow.querySelectorAll(".ratio-box").forEach((box) => box.classList.add("highlight-active"));

    // --- लाइव-सेंटरिंग और स्केल फ़ंक्शन ---
    const centerHead = () => {
        const containerRect = document.getElementById("scrollContainer").getBoundingClientRect();
        const rowRect = coupleRow.getBoundingClientRect();
        const wrapperRect = document.getElementById("zoomWrapper").getBoundingClientRect();
        
        const currentOffsetX = (rowRect.left - wrapperRect.left) / scale;
        
        pointX = containerRect.width / 2 - currentOffsetX * scale - rowRect.width / 2;
        pointY = 100;
        updateTransform(); 
    };

    centerHead();

    if (branchItem) {
        branchItem.querySelectorAll(".nodes-container").forEach((container) => {
            container.classList.remove("collapsed-children");
            const stem = container.parentElement.querySelector(".couple-box-wrapper .stem-down");
            const btn = container.parentElement.querySelector(".couple-box-wrapper .toggle-btn");
            if (stem) stem.style.display = "block";
            if (btn) btn.innerText = "-";
        });

        const childRows = branchItem.querySelectorAll(".nodes-container .couple-row");
        const DELAY_PER_ROW = 80;
        const totalDuration = (childRows.length + 3) * DELAY_PER_ROW;

        let startTime = performance.now();
        const liveCenterLoop = (currentTime) => {
            centerHead(); 
            if (currentTime - startTime < totalDuration) {
                requestAnimationFrame(liveCenterLoop);
            } else {
                centerHead(); 
            }
        };

        childRows.forEach((row, index) => {
            setTimeout(() => {
                row.classList.add("child-size-large");
                row.querySelectorAll(".ratio-box").forEach((box) => {
                    box.classList.add("highlight-active");
                });
            }, (index + 2) * DELAY_PER_ROW);
        });

        requestAnimationFrame(liveCenterLoop);
    }
}

function closeAllMenusOutside(event) {
    if (hasDragged) return;
    document.querySelectorAll(".details-corner-btn").forEach((btn) => (btn.style.display = "none"));
    document.querySelectorAll(".head-btn").forEach((btn) => (btn.style.display = "none"));
    document.querySelectorAll(".ratio-box").forEach((box) => box.classList.remove("highlight-active"));
}


/* ==========================================================
   4. POPUP / DETAILS DIALOG LOGIC
   ================================================---------- */

function showPersonDetails(targetName, event) {
    if (event) event.stopPropagation();
    
    function findPerson(node, name) {
        if (node.name === name) return node;
        if (node.wife && node.wife.name === name) return node.wife;
        if (node.husband && node.husband.name === name) return node.husband;
        if (node.children) {
            for (let child of node.children) {
                const found = findPerson(child, name);
                if (found) return found;
            }
        }
        return null;
    }
    
    const person = findPerson(familyData, targetName);
    if (!person) return;
    
    const oldDialog = document.getElementById("memberDialog");
    if (oldDialog) oldDialog.remove();
    
    const dialog = document.createElement("div");
    dialog.id = "memberDialog";
    dialog.className = "dialog-overlay";
    
    const hasImage = person.image && person.image.trim() !== "";
    const memberName = (person.name && person.name.trim() !== "") ? person.name : "Unknown";
    const genderClass = person.gender === "Female" ? "female-box" : "male-box";
    
    let avatarHtml = "";
    if (hasImage) {
        avatarHtml = `<img src="${person.image}" class="dialog-avatar" onerror="this.style.display='none'">`;
    } else {
        avatarHtml = `
            <div class="${genderClass}" style="width: 100px; height: 100px; margin: 0 auto 15px auto; border-radius: 50%; overflow: hidden; position: relative; border: 3px solid ${person.gender === 'Female' ? '#e91e63' : '#1a73e8'}; box-shadow: 0 4px 10px rgba(0,0,0,0.15);">
                <div class="image-container" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0;">
                    <div class="avatar-fallback-head"></div>
                    <div class="avatar-fallback-body"></div>
                </div>
            </div>
        `;
    }
    
    dialog.innerHTML = `
     <div class="dialog-content">
         <span id="closeDialogBtn" class="dialog-close-btn">&times;</span>
         ${avatarHtml}
         <h2>${memberName}</h2>
         <p><b>Gender:</b> ${person.gender || "-"}</p>
         <p><b>Status:</b> ${person.status || "Living"}</p>
         ${person.dob ? `<p><b>Date of Birth:</b> ${person.dob}</p>` : ""}
     </div>
    `;
    
    document.body.appendChild(dialog);
    document.getElementById("closeDialogBtn").onclick = () => { dialog.remove(); };
    dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
}


/* ==========================================================
   5. EVENT LISTENERS (Mouse & Touch Pan/Zoom)
   ================================================---------- */

// --- Mouse Events (PC / Laptop) ---
containerEl.addEventListener("mousedown", (e) => {
    if (e.target.closest(".toggle-btn") || e.target.closest(".details-corner-btn") || e.target.closest(".head-btn")) return;
    isDragging = true;
    hasDragged = false;
    document.getElementById("zoomWrapper").classList.add("dragging");
    start = { x: e.clientX - pointX, y: e.clientY - pointY };
});

window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const deltaX = Math.abs(e.clientX - (start.x + pointX));
    const deltaY = Math.abs(e.clientY - (start.y + pointY));
    if (deltaX > 4 || deltaY > 4) {
        hasDragged = true;
    }
    pointX = e.clientX - start.x;
    pointY = e.clientY - start.y;
    updateTransform();
});

window.addEventListener("mouseup", () => {
    isDragging = false;
    document.getElementById("zoomWrapper").classList.remove("dragging");
    setTimeout(() => { hasDragged = false; }, 50);
});

// --- Touch Events (Mobile) ---
containerEl.addEventListener("touchstart", (e) => {
    if (e.target.closest(".toggle-btn") || e.target.closest(".details-corner-btn") || e.target.closest(".head-btn")) return;
    
    if (e.touches.length === 1) {
        isDragging = true;
        hasDragged = false;
        document.getElementById("zoomWrapper").classList.add("dragging");
        start = { x: e.touches[0].clientX - pointX, y: e.touches[0].clientY - pointY };
    } else if (e.touches.length === 2) {
        isDragging = false;
        touchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
    }
});

containerEl.addEventListener("touchmove", (e) => {
    if (isDragging && e.touches.length === 1) {
        const deltaX = Math.abs(e.touches[0].clientX - (start.x + pointX));
        const deltaY = Math.abs(e.touches[0].clientY - (start.y + pointY));
        if (deltaX > 4 || deltaY > 4) {
            hasDragged = true;
        }
        pointX = e.touches[0].clientX - start.x;
        pointY = e.touches[0].clientY - start.y;
        updateTransform();
    } else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
        );
        const rect = containerEl.getBoundingClientRect();
        const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
        let newScale = scale;
        if (dist > touchStartDist) {
            if (scale < 3) newScale = scale * 1.05;
        } else {
            if (scale > 0.1) newScale = scale / 1.05;
        }
        pointX = midX - (midX - pointX) * (newScale / scale);
        pointY = midY - (midY - pointY) * (newScale / scale);
        scale = newScale;
        touchStartDist = dist;
        updateTransform();
    }
}, { passive: false });

containerEl.addEventListener("touchend", () => {
    isDragging = false;
    document.getElementById("zoomWrapper").classList.remove("dragging");
    setTimeout(() => { hasDragged = false; }, 50);
});


/* ==========================================================
   6. INITIALIZATION ON PAGE LOAD
   ================================================---------- */

window.addEventListener("DOMContentLoaded", () => {
    updateTransform();
    setTimeout(() => {
        let defaultBox = document.querySelector('.ratio-box[data-name="Bablu Nonia"]');
        if (!defaultBox) {
            defaultBox = document.querySelector('.ratio-box');
        }
        if (defaultBox) {
            makeHeadAndScale(defaultBox.getAttribute("data-name"));
        }
    }, 150);
});
