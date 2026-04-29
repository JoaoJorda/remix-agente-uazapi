-- Adicionar constraint única para message_id para evitar duplicatas
ALTER TABLE nina_processing_queue 
ADD CONSTRAINT nina_processing_queue_message_id_unique 
UNIQUE (message_id);