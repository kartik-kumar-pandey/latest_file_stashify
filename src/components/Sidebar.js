import React, { useState } from 'react';

function Sidebar({ activeView, onViewChange, onCollapsedChange }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleCollapseToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    if (onCollapsedChange) {
      onCollapsedChange(newCollapsedState);
    }
  };

  const mainMenuItems = [
    {
      id: 'all-files',
      label: 'All Files',
      icon: '📁',
      hasDropdown: true,
      isActive: activeView === 'all-files'
    },
    {
      id: 'recent',
      label: 'Recent',
      icon: '🕐',
      isActive: activeView === 'recent'
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: '❤️',
      isActive: activeView === 'favorites'
    },
    {
      id: 'shared',
      label: 'Shared',
      icon: '🔗',
      isActive: activeView === 'shared'
    },
    {
      id: 'tags',
      label: 'Tags',
      icon: '🏷️',
      isActive: activeView === 'tags'
    }
  ];

  const bottomMenuItems = [
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️',
      isActive: activeView === 'settings'
    },
    {
      id: 'deleted-files',
      label: 'Deleted Files',
      icon: '🗑️',
      isActive: activeView === 'deleted-files'
    }
  ];

  return (
         <div 
       className="sidebar"
       style={{
         width: isCollapsed ? '60px' : '240px',
         height: 'calc(100vh - 72px)',
         backgroundColor: '#ffffff',
         borderRight: '1px solid #e1e5e9',
         display: 'flex',
         flexDirection: 'column',
         transition: 'width 0.3s ease',
         position: 'fixed',
         left: 0,
         top: '72px',
         zIndex: 1000,
         boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
       }}
     >
             {/* Sidebar Header */}
       <div 
         className="sidebar-header"
         style={{
           padding: '16px',
           borderBottom: '1px solid #e1e5e9',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'flex-end',
           minHeight: '60px'
         }}
       >
         <button
           onClick={handleCollapseToggle}
           style={{
             background: 'none',
             border: 'none',
             cursor: 'pointer',
             padding: '8px',
             borderRadius: '6px',
             color: '#666',
             fontSize: '16px',
             display: 'flex',
             alignItems: 'center',
             justifyContent: 'center',
             width: '32px',
             height: '32px',
             transition: 'background-color 0.2s ease'
           }}
           onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f0f0'}
           onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
           title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
         >
           {isCollapsed ? '→' : '←'}
         </button>
       </div>

             {/* Main Navigation Menu */}
       <nav 
         className="sidebar-nav"
         style={{
           flex: 1,
           padding: '16px 0',
           overflowY: 'auto'
         }}
       >
         <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
           {mainMenuItems.map((item, index) => (
             <li key={item.id}>
               <button
                 onClick={() => onViewChange(item.id)}
                 style={{
                   width: '100%',
                   padding: '12px 16px',
                   background: item.isActive 
                     ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                     : 'transparent',
                   border: 'none',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '12px',
                   color: item.isActive ? '#ffffff' : '#666666',
                   fontSize: '14px',
                   fontWeight: item.isActive ? '600' : '500',
                   transition: 'all 0.2s ease',
                   position: 'relative',
                   textAlign: 'left',
                   minHeight: '44px'
                 }}
                 onMouseEnter={(e) => {
                   if (!item.isActive) {
                     e.target.style.backgroundColor = '#f8f9fa';
                     e.target.style.color = '#333333';
                   }
                 }}
                 onMouseLeave={(e) => {
                   if (!item.isActive) {
                     e.target.style.backgroundColor = 'transparent';
                     e.target.style.color = '#666666';
                   }
                 }}
                 title={isCollapsed ? item.label : undefined}
               >
                 {/* Active indicator */}
                 {item.isActive && (
                   <div style={{
                     position: 'absolute',
                     left: 0,
                     top: 0,
                     bottom: 0,
                     width: '3px',
                     backgroundColor: '#ffffff',
                     borderRadius: '0 2px 2px 0'
                   }} />
                 )}
                 
                 {/* Icon */}
                 <span style={{ 
                   fontSize: '18px', 
                   minWidth: '20px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
                   {item.icon}
                 </span>
                 
                 {/* Label */}
                 {!isCollapsed && (
                   <span style={{ flex: 1 }}>
                     {item.label}
                   </span>
                 )}
                 
                 {/* Dropdown arrow */}
                 {!isCollapsed && item.hasDropdown && (
                   <span style={{ 
                     fontSize: '12px',
                     opacity: 0.7
                   }}>
                     ▼
                   </span>
                 )}
               </button>
             </li>
           ))}
         </ul>
       </nav>

       {/* Bottom Navigation Menu */}
       <nav 
         className="sidebar-bottom-nav"
         style={{
           padding: '16px 0',
           borderTop: '1px solid #e1e5e9'
         }}
       >
         <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
           {bottomMenuItems.map((item, index) => (
             <li key={item.id}>
               <button
                 onClick={() => onViewChange(item.id)}
                 style={{
                   width: '100%',
                   padding: '12px 16px',
                   background: item.isActive 
                     ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                     : 'transparent',
                   border: 'none',
                   cursor: 'pointer',
                   display: 'flex',
                   alignItems: 'center',
                   gap: '12px',
                   color: item.isActive ? '#ffffff' : '#666666',
                   fontSize: '14px',
                   fontWeight: item.isActive ? '600' : '500',
                   transition: 'all 0.2s ease',
                   position: 'relative',
                   textAlign: 'left',
                   minHeight: '44px'
                 }}
                 onMouseEnter={(e) => {
                   if (!item.isActive) {
                     e.target.style.backgroundColor = '#f8f9fa';
                     e.target.style.color = '#333333';
                   }
                 }}
                 onMouseLeave={(e) => {
                   if (!item.isActive) {
                     e.target.style.backgroundColor = 'transparent';
                     e.target.style.color = '#666666';
                   }
                 }}
                 title={isCollapsed ? item.label : undefined}
               >
                 {/* Active indicator */}
                 {item.isActive && (
                   <div style={{
                     position: 'absolute',
                     left: 0,
                     top: 0,
                     bottom: 0,
                     width: '3px',
                     backgroundColor: '#ffffff',
                     borderRadius: '0 2px 2px 0'
                   }} />
                 )}
                 
                 {/* Icon */}
                 <span style={{ 
                   fontSize: '18px', 
                   minWidth: '20px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center'
                 }}>
                   {item.icon}
                 </span>
                 
                 {/* Label */}
                 {!isCollapsed && (
                   <span style={{ flex: 1 }}>
                     {item.label}
                   </span>
                 )}
               </button>
             </li>
           ))}
         </ul>
       </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div 
          className="sidebar-footer"
          style={{
            padding: '16px',
            borderTop: '1px solid #e1e5e9',
            fontSize: '12px',
            color: '#999',
            textAlign: 'center'
          }}
        >
          <div>FileStashify v1.0</div>
          <div style={{ marginTop: '4px' }}>Secure Cloud Storage</div>
        </div>
      )}
    </div>
  );
}

export default Sidebar; 