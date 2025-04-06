document.addEventListener('DOMContentLoaded', function() {
    // Mobile menu toggle functionality
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const assignmentBoxes = document.querySelectorAll('.assignment-box');

    // Toggle mobile menu
    menuToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.toggle('active');
        document.body.classList.toggle('no-scroll');
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (!sidebar.contains(e.target) && e.target !== menuToggle) {
            sidebar.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    });

    // Filter projects by category
    function filterProjects(category) {
        assignmentBoxes.forEach(box => {
            if (category === 'all' || box.dataset.category === category) {
                box.classList.remove('hidden');
            } else {
                box.classList.add('hidden');
            }
        });

        // Update active states for all filter buttons
        document.querySelectorAll('.filter-btn, .category-tab').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === category);
        });
    }

    // Event delegation for filter buttons
    document.addEventListener('click', function(e) {
        // Handle category tabs
        if (e.target.classList.contains('category-tab')) {
            const category = e.target.dataset.category;
            filterProjects(category);
            
            // Smooth scroll to maintain position
            window.scrollTo({
                top: document.getElementById('assignments').offsetTop - 80,
                behavior: 'smooth'
            });
        }
        
        // Handle sidebar filter buttons
        if (e.target.classList.contains('filter-btn')) {
            e.preventDefault();
            const category = e.target.dataset.category;
            filterProjects(category);
            
            // Close sidebar on mobile after selection
            if (window.innerWidth <= 768) {
                sidebar.classList.remove('active');
                document.body.classList.remove('no-scroll');
            }
        }
    });

    // Initialize with all projects shown
    filterProjects('all');

    // Add animation effects when projects appear
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Apply initial styles and observe each project card
    assignmentBoxes.forEach(box => {
        box.style.opacity = 0;
        box.style.transform = 'translateY(20px)';
        box.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        observer.observe(box);
    });

    // Handle window resize to close sidebar if switching to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove('active');
            document.body.classList.remove('no-scroll');
        }
    });
});