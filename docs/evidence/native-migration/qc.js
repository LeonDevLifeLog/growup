

    (function(){
        // 日期
        var d=new Date();document.getElementById('todayDate').textContent=d.getFullYear()+'年'+(d.getMonth()+1)+'月'+d.getDate()+'日';
        // 星星
        var bg=document.getElementById('starsBg');
        for(var i=0;i<25;i++){var s=document.createElement('div');s.className='star';s.style.left=Math.random()*100+'%';s.style.top=Math.random()*100+'%';var sz=2+Math.random()*3;s.style.width=sz+'px';s.style.height=sz+'px';s.style.setProperty('--dur',(2+Math.random()*4)+'s');s.style.animationDelay=Math.random()*4+'s';bg.appendChild(s);}

        // 弹窗交互
        var modal = document.getElementById('conceptModal');
        var openBtn = document.getElementById('openConceptBtn');
        var closeBtn = document.getElementById('closeModalBtn');

        openBtn.addEventListener('click', function() {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });

        function closeModal() {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }

        closeBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', function(e) {
            if (e.target === modal) closeModal();
        });

        // 阻止弹窗内容滑动时穿透
        document.querySelector('.modal-content').addEventListener('touchmove', function(e){
            e.stopPropagation();
        }, { passive: true });

    })();
    